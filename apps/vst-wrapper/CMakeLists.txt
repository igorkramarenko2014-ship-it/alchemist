# Alchemist FXP Bridge — minimal JUCE VST3 (read-only .fxp consumer).
# JUCE: FetchContent GIT_TAG 8.0.8 below, or local tree via env JUCE_PATH.
# Build from monorepo root: `pnpm build:vst` → ../../scripts/vst-build.mjs runs
# `cmake -B build -S .` + `cmake --build` here, then copies the `.vst3` to the OS VST3 dir.
cmake_minimum_required(VERSION 3.22)
project(AlchemistFxpBridge VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(DEFINED ENV{JUCE_PATH} AND EXISTS "$ENV{JUCE_PATH}/CMakeLists.txt")
    add_subdirectory("$ENV{JUCE_PATH}" "${CMAKE_BINARY_DIR}/juce-build" EXCLUDE_FROM_ALL)
else()
    include(FetchContent)
    FetchContent_Declare(
        juce
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        GIT_TAG 8.0.8
    )
    FetchContent_MakeAvailable(juce)
endif()

juce_add_plugin(AlchemistFxpBridge
    VERSION 0.1.0
    COMPANY_NAME Alchemist
    BUNDLE_ID com.alchemist.fxpbridge
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE Amfx
    PLUGIN_CODE Afxb
    FORMATS VST3
    VST3_CATEGORIES Fx
    PRODUCT_NAME "Alchemist FXP Bridge")

target_sources(AlchemistFxpBridge
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp)

target_compile_definitions(AlchemistFxpBridge
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0)

target_link_libraries(AlchemistFxpBridge
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_plugin_client
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
