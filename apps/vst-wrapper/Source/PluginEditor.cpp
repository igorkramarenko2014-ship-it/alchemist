#include "PluginEditor.h"
#include "PluginProcessor.h"

AlchemistFxpBridgeEditor::AlchemistFxpBridgeEditor(AlchemistFxpBridgeProcessor& p)
    : AudioProcessorEditor(&p), processor(p)
{
    setSize(320, 220);
    setOpaque(true);

    addAndMakeVisible(loadButton);
    loadButton.onClick = [this] { processor.loadTrialPresetFromWatchFolder(); };

    statusLabel.setJustificationType(juce::Justification::centred);
    statusLabel.setFont(13.0f);
    addAndMakeVisible(statusLabel);

    watchLabel.setJustificationType(juce::Justification::centred);
    watchLabel.setFont(11.0f);
    watchLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));
    addAndMakeVisible(watchLabel);

    stanceLabel.setJustificationType(juce::Justification::centred);
    stanceLabel.setFont(12.0f);
    addAndMakeVisible(stanceLabel);

    startTimerHz(4);
}

AlchemistFxpBridgeEditor::~AlchemistFxpBridgeEditor()
{
    stopTimer();
}

void AlchemistFxpBridgeEditor::timerCallback()
{
    statusLabel.setText(processor.getLastStatusLine(), juce::dontSendNotification);
    watchLabel.setText("Watch: " + processor.getWatchFolderDisplay(), juce::dontSendNotification);
    const bool disrupt = processor.getStance() == AlchemistFxpBridgeProcessor::Stance::disrupt;
    stanceLabel.setText(disrupt ? "IOM: DISRUPT (auto poll 2s)" : "IOM: CONSOLIDATE (manual load only)",
                        juce::dontSendNotification);
    stanceLabel.setColour(juce::Label::textColourId,
                          disrupt ? juce::Colour(0xfff87171) : juce::Colour(0xff5eead4));
}

void AlchemistFxpBridgeEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff111827));

    auto orb = getLocalBounds().removeFromTop(100).reduced(40, 10);
    juce::ColourGradient grad(juce::Colour(0xff5eead4),
                              orb.getCentre().toFloat(),
                              juce::Colour(0xff0f766e),
                              orb.getCentre().toFloat().translated(18.0f, 22.0f),
                              true);
    g.setGradientFill(grad);
    g.fillEllipse(orb.toFloat());

    g.setColour(juce::Colours::white.withAlpha(0.9f));
    g.setFont(14.0f);
    g.drawFittedText("Alchemist FXP Bridge", getLocalBounds().removeFromTop(24), juce::Justification::centred, 1);
}

void AlchemistFxpBridgeEditor::resized()
{
    auto r = getLocalBounds();
    r.removeFromTop(100);
    loadButton.setBounds(r.removeFromTop(32).reduced(40, 0));
    r.removeFromTop(6);
    statusLabel.setBounds(r.removeFromTop(36).reduced(8, 0));
    watchLabel.setBounds(r.removeFromTop(22).reduced(8, 0));
    stanceLabel.setBounds(r.removeFromTop(24).reduced(8, 0));
}
