tell application "Keynote"
	activate
	set theDoc to make new document
	set theSlide to first slide of theDoc
		try
			if (count of text items of theSlide) is greater than or equal to 1 then set object text of text item 1 of theSlide to "AIOM — Governed Inference Infrastructure"
		end try
		try
			if (count of text items of theSlide) is greater than or equal to 2 then
				set object text of text item 2 of theSlide to "Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure."
			else if (count of text items of theSlide) is greater than or equal to 1 then
				set object text of text item 1 of theSlide to "AIOM — Governed Inference Infrastructure" & return & "Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure."
			end if
		end try
set theSlide to make new slide at end of slides of theDoc
		try
			if (count of text items of theSlide) is greater than or equal to 1 then set object text of text item 1 of theSlide to "AI Healthy Environment"
		end try
		try
			if (count of text items of theSlide) is greater than or equal to 2 then
				set object text of text item 2 of theSlide to "Deterministic TypeScript gatekeeping\No shadow governance\Explicit degraded-mode telemetry"
			else if (count of text items of theSlide) is greater than or equal to 1 then
				set object text of text item 1 of theSlide to "AI Healthy Environment" & return & "Deterministic TypeScript gatekeeping\No shadow governance\Explicit degraded-mode telemetry"
			end if
		end try
set theSlide to make new slide at end of slides of theDoc
		try
			if (count of text items of theSlide) is greater than or equal to 1 then set object text of text item 1 of theSlide to "AIOM Control Plane"
		end try
		try
			if (count of text items of theSlide) is greater than or equal to 2 then
				set object text of text item 2 of theSlide to "Triad orchestration + consensus\Slavic/Undercover validation\Human-in-the-loop policy evolution"
			else if (count of text items of theSlide) is greater than or equal to 1 then
				set object text of text item 1 of theSlide to "AIOM Control Plane" & return & "Triad orchestration + consensus\Slavic/Undercover validation\Human-in-the-loop policy evolution"
			end if
		end try
set theSlide to make new slide at end of slides of theDoc
		try
			if (count of text items of theSlide) is greater than or equal to 1 then set object text of text item 1 of theSlide to "Proof Layer"
		end try
		try
			if (count of text items of theSlide) is greater than or equal to 2 then
				set object text of text item 2 of theSlide to "Tests: 292 / 55 files\AIOM integrity: 0.92\Receipt: available"
			else if (count of text items of theSlide) is greater than or equal to 1 then
				set object text of text item 1 of theSlide to "Proof Layer" & return & "Tests: 292 / 55 files\AIOM integrity: 0.92\Receipt: available"
			end if
		end try
set theSlide to make new slide at end of slides of theDoc
		try
			if (count of text items of theSlide) is greater than or equal to 1 then set object text of text item 1 of theSlide to "Resilience & Immunity"
		end try
		try
			if (count of text items of theSlide) is greater than or equal to 2 then
				set object text of text item 2 of theSlide to "PNH scenarios: 25\Breaches: 2\Verdict: degraded"
			else if (count of text items of theSlide) is greater than or equal to 1 then
				set object text of text item 1 of theSlide to "Resilience & Immunity" & return & "PNH scenarios: 25\Breaches: 2\Verdict: degraded"
			end if
		end try
end tell