#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

class AlchemistFxpBridgeProcessor;

class AlchemistFxpBridgeEditor : public juce::AudioProcessorEditor,
                                 private juce::Timer
{
public:
    explicit AlchemistFxpBridgeEditor(AlchemistFxpBridgeProcessor&);
    ~AlchemistFxpBridgeEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    AlchemistFxpBridgeProcessor& processor;
    juce::TextButton loadButton { "Load trial .fxp" };
    juce::Label statusLabel;
    juce::Label watchLabel;
    juce::Label stanceLabel;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AlchemistFxpBridgeEditor)
};
