#include "PluginProcessor.h"
#include "PluginEditor.h"

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <iostream>

namespace
{
/**
 * Non-authoritative sanity check only — same header layout as `packages/fxp-encoder/src/lib.rs`
 * (`decode_fxp_fxck` prefix). HARD GATE remains Python/TS/Rust; this rejects obvious garbage
 * before storing bytes in-plugin.
 */
constexpr size_t kMinSerumBankBytes = 0x38 + 4;

bool isLikelySerumFxpBank(const void* data, size_t size)
{
    if (data == nullptr || size < kMinSerumBankBytes)
        return false;
    const auto* bytes = static_cast<const std::uint8_t*>(data);
    static constexpr std::uint8_t kCcnK[] = { 'C', 'c', 'n', 'K' };
    static constexpr std::uint8_t kFxCk[] = { 'F', 'x', 'C', 'k' };
    static constexpr std::uint8_t kFPCh[] = { 'F', 'P', 'C', 'h' };
    if (std::memcmp(bytes, kCcnK, 4) != 0)
        return false;
    const bool fxck = std::memcmp(bytes + 8, kFxCk, 4) == 0;
    const bool fpch = std::memcmp(bytes + 8, kFPCh, 4) == 0;
    return fxck || fpch;
}

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
    destData.replaceAll(programData.getData(), programData.getSize());
}

void AlchemistFxpBridgeProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    const auto n = static_cast<size_t>(juce::jmax(0, sizeInBytes));
    if (data != nullptr && n > 0 && !isLikelySerumFxpBank(data, n))
    {
        juce::DynamicObject::Ptr w(new juce::DynamicObject());
        w->setProperty("schism", "state_chunk_not_serum_fxp_shape");
        w->setProperty("size", static_cast<int>(n));
        w->setProperty("note", "Host recalled bytes that do not match Serum bank header — stored anyway for session fidelity");
        emitWrapperLog("vst_wrapper_schism", juce::var(w.get()));
    }
    programData.replaceAll(data, n);
    lastStatusLine = "Restored state (" + juce::String(static_cast<int>(n)) + " bytes)";
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

    if (!isLikelySerumFxpBank(fxpData.getData(), fxpData.getSize()))
    {
        juce::DynamicObject::Ptr e(new juce::DynamicObject());
        e->setProperty("error", "fxp_header_invalid");
        e->setProperty("path", fxpFile.getFullPathName());
        e->setProperty("size", static_cast<int>(fxpData.getSize()));
        e->setProperty("note", "Expected CcnK + FxCk/FPCh at byte 8 (see fxp-encoder decode precheck)");
        emitWrapperLog("vst_wrapper_error", juce::var(e.get()));
        lastStatusLine = "Error: not a Serum-style .fxp bank";
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
