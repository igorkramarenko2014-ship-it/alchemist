#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

/** Read-only holder for validated Serum FxCk `.fxp` bytes (this plugin's program state). */
class AlchemistFxpBridgeProcessor : public juce::AudioProcessor,
                                    private juce::Timer
{
public:
    enum class Stance { consolidate, disrupt };

    AlchemistFxpBridgeProcessor();
    ~AlchemistFxpBridgeProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return { "Alchemist FXP Bridge" }; }

    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    /** Load file into internal `programData` and host state (does not open Serum). */
    void loadAlchemistFxp(const juce::File& fxpFile);
    void loadTrialPresetFromWatchFolder();
    void checkForNewPreset();

    juce::String getLastStatusLine() const { return lastStatusLine; }
    juce::String getWatchFolderDisplay() const { return watchRoot.getFullPathName(); }
    Stance getStance() const { return stance; }

private:
    void timerCallback() override;
    static void emitWrapperLog(const juce::String& event, const juce::var& payload);
    juce::File resolveWatchRoot() const;

    juce::MemoryBlock programData;
    juce::File watchRoot;
    juce::File lastLoadedFile;
    juce::Time lastModTime;
    juce::String lastStatusLine { "No preset loaded" };
    Stance stance { Stance::consolidate };
    static constexpr const char* kTrialName = "alchemist_trial.fxp";

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AlchemistFxpBridgeProcessor)
};
