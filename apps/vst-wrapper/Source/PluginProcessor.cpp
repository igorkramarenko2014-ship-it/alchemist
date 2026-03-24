#include "PluginProcessor.h"
#include "PluginEditor.h"

#include <cstdlib>
#include <iostream>

namespace
{
juce::String envOrEmpty(const char* key)
{
    if (auto* s = std::getenv(key))
        return juce::String(s).trim();
    return {};
}
} // namespace

void AlchemistFxpBridgeProcessor::emitWrapperLog(const juce::String& event, const juce::var& payload)
{
    juce::DynamicObject::Ptr root(new juce::DynamicObject());
    root->setProperty("event", event);
    root->setProperty("ts", juce::Time::getCurrentTime().toISO8601(true));
    root->setProperty("provenance", "vst_wrapper");
    if (auto* obj = payload.getDynamicObject())
    {
        for (const auto& it : obj->getProperties())
            root->setProperty(it.name.toString(), it.value);
    }
    std::cerr << juce::JSON::toString(juce::var(root.get()), false) << std::endl;
}

juce::File AlchemistFxpBridgeProcessor::resolveWatchRoot() const
{
    if (auto p = envOrEmpty("ALCHEMIST_VST_WATCH_PATH"); p.isNotEmpty())
        return juce::File(p).getStandardisedFile();

#if JUCE_MAC
    return juce::File("~/Library/Audio/Presets/Xfer Records/Serum Presets/User").getStandardisedFile();
#elif JUCE_WINDOWS
    auto app = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory);
    return app.getChildFile("Xfer").getChildFile("Serum").getChildFile("Presets").getChildFile("User");
#else
    return juce::File("~/Alchemist/vst-watch").getStandardisedFile();
#endif
}

AlchemistFxpBridgeProcessor::AlchemistFxpBridgeProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    watchRoot = resolveWatchRoot();
    if (auto st = envOrEmpty("ALCHEMIST_VST_STANCE"); st.equalsIgnoreCase("DISRUPT"))
        stance = Stance::disrupt;
    else
        stance = Stance::consolidate;

    if (stance == Stance::disrupt)
        startTimer(2000);

    juce::DynamicObject::Ptr startMeta(new juce::DynamicObject());
    startMeta->setProperty("watchFolder", watchRoot.getFullPathName());
    startMeta->setProperty("stance", stance == Stance::disrupt ? "DISRUPT" : "CONSOLIDATE");
    emitWrapperLog("vst_wrapper_started", juce::var(startMeta.get()));
}

AlchemistFxpBridgeProcessor::~AlchemistFxpBridgeProcessor()
{
    stopTimer();
}

void AlchemistFxpBridgeProcessor::prepareToPlay(double, int) {}
void AlchemistFxpBridgeProcessor::timerCallback()
{
    if (stance != Stance::disrupt)
        return;
    checkForNewPreset();
}

bool AlchemistFxpBridgeProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    const auto& mainOut = layouts.getMainOutputChannelSet();
    return mainOut == juce::AudioChannelSet::mono() || mainOut == juce::AudioChannelSet::stereo();
}

void AlchemistFxpBridgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    const int inCh = getTotalNumInputChannels();
    const int outCh = getTotalNumOutputChannels();
    for (int i = inCh; i < outCh; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());
}

void AlchemistFxpBridgeProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    destData.append(programData.getData(), programData.getSize());
}

void AlchemistFxpBridgeProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    programData.replaceAll(data, static_cast<size_t>(sizeInBytes));
    lastStatusLine = "Restored state (" + juce::String(sizeInBytes) + " bytes)";
}

void AlchemistFxpBridgeProcessor::loadAlchemistFxp(const juce::File& fxpFile)
{
    if (!fxpFile.existsAsFile())
    {
        juce::DynamicObject::Ptr e(new juce::DynamicObject());
        e->setProperty("error", "file_not_found");
        e->setProperty("path", fxpFile.getFullPathName());
        emitWrapperLog("vst_wrapper_error", juce::var(e.get()));
        lastStatusLine = "Error: file not found";
        return;
    }

    juce::MemoryBlock fxpData;
    if (!fxpFile.loadFileAsData(fxpData))
    {
        juce::DynamicObject::Ptr e(new juce::DynamicObject());
        e->setProperty("error", "read_failed");
        e->setProperty("path", fxpFile.getFullPathName());
        emitWrapperLog("vst_wrapper_error", juce::var(e.get()));
        lastStatusLine = "Error: read failed";
        return;
    }

    programData = fxpData;
    lastLoadedFile = fxpFile;
    lastModTime = fxpFile.getLastModificationTime();
    lastStatusLine = "Loaded: " + fxpFile.getFileName() + " (" + juce::String(static_cast<int>(fxpData.getSize())) + " B)";

    juce::DynamicObject::Ptr ok(new juce::DynamicObject());
    ok->setProperty("path", fxpFile.getFullPathName());
    ok->setProperty("size", static_cast<int>(fxpData.getSize()));
    ok->setProperty("success", true);
    emitWrapperLog("vst_wrapper_loaded", juce::var(ok.get()));

    updateHostDisplay(juce::AudioProcessor::ChangeDetails().withNonParameterStateChanged(true));
}

void AlchemistFxpBridgeProcessor::loadTrialPresetFromWatchFolder()
{
    const auto f = watchRoot.getChildFile(kTrialName);
    loadAlchemistFxp(f);
}

void AlchemistFxpBridgeProcessor::checkForNewPreset()
{
    const auto f = watchRoot.getChildFile(kTrialName);
    if (!f.existsAsFile())
        return;
    const auto t = f.getLastModificationTime();
    if (lastLoadedFile == f && t == lastModTime)
        return;
    loadAlchemistFxp(f);
}

juce::AudioProcessorEditor* AlchemistFxpBridgeProcessor::createEditor()
{
    return new AlchemistFxpBridgeEditor(*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AlchemistFxpBridgeProcessor();
}
