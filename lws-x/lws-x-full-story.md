# LWS X: Sub-250 g endurance RC plane

**LWS X** is a radio-controlled plane with a one-meter-class wingspan that weighs under 250 grams, battery and payload included. It is the current generation of the Light-Weight System (LWS), which I have designed, built and flown since 2024.

Nine generations took it from a 263g tube glider that flew for three seconds to the 216g Predecessor. Generation X draws on a 275-airfoil XFoil sweep, OpenFOAM CFD and a custom motor controller.

## The brief: under 250g, 40g payload, 30 minutes aloft

Generation X must weigh under 250g including battery and payload, with a 210g target. It must carry at least 40g of electronics (camera, video transmitter, flight controller and GPS) in a protected bay and power them with at least 5W, fly 30 minutes at 15°C and 15 minutes at 0°C with full payload, cruise steadily at about 7 m/s, and be hand-launched by one person. It should also swap batteries in under a minute without tools, fit in a backpack, be ready to fly within five minutes, operate between 0 and 150 meters, and cost under $250 for the airframe and propulsion, excluding electronics. Regulatory and safety requirements, including FPV frequency selection, lighting for night flying, and privacy and local laws, are being reviewed alongside the design.

## 275 airfoils ranked: the I.S.A. 960 has 2.2× the E205's lift-to-drag

Flight testing showed that the speed needed for level flight is closer to 8 m/s than the 7 m/s cruise target. With the 110mm chord, 8 m/s gives a Reynolds number of about 60,300 at sea level and about 59,500 at 150 meters in the standard atmosphere, so I averaged the design Reynolds number at 60,000 across the operating envelope.

To choose the airfoil, 275 airfoils were run through XFoil 6.99, the panel-method solver that airfoiltools.com also uses, at Re 60,000, Ncrit 9 and 160 panels, sweeping α from −5° to 15° in 0.25° steps. Coordinates came from airfoiltools, the UIUC Airfoil Coordinates Database or the AeroSandbox database, every file was converted to one format, and blunt trailing edges that XFoil would otherwise under-predict were closed. The results were ranked in an interactive tool. The selection followed five steps: find the Reynolds number from the operating environment, choose a metric based on the operational goal, filter by camber and thickness, compare the polars at their optimal angles of attack, and choose the airfoil based on fabrication feasibility and the goal metrics.

The metric was the best lift-to-drag ratio (Cl/Cd) between 0° and 5°, the angles the wing actually sees in cruise with its 5° incidence. Every candidate was kept to a range of cambers and a maximum thickness of more than 8mm at the 110mm chord, so the wing can be built from balsa and PLA with room for a spar. The thinnest of the 275 is 8.8mm.

Generation X uses the I.S.A. 960. It scores 43.7 at 4.75°, fourth of the 273 airfoils that converged in the cruise window and within 3% of the best score of 45.0. At 10.3mm thick with 5.7% camber, it is thicker than the two MID 108 sections that score higher, which are 9.2mm thick, and its best point falls inside the cruise window rather than at its edge.

Compared with the E205 used up to Generation Nine, at each airfoil's best point in the cruise window and Re 60,000, the drag coefficient (Cd) drops from 0.0329 to 0.0228, about 31% lower, and the lift coefficient (Cl) rises from 0.651 to 0.998, about 53% higher. The best section lift-to-drag ratio improves from 19.8 to 43.7, about 2.2 times higher.

## PIFOAMUI: CFD fast enough to run between builds

The streamlining of both bodies was guided by CFD run through PIFOAMUI, a browser interface for OpenFOAM 13, the open-source CFD toolkit. The goal was to make aerodynamic changes quick enough to test between builds, instead of writing OpenFOAM dictionaries and setting up each case by hand. So far, CFD has been run at level flight to compare Generation Nine with Generation X.

A case starts from an STL and flow conditions: speed, angle of attack and yaw, ground, and half models on a symmetry plane. The GUI meshes with blockMesh and snappyHexMesh, adding boundary layers sized by thickness or a y+ target, then checks quality with checkMesh and retries at a finer level if meshing fails. It solves steady (SIMPLE) or transient (PIMPLE) flow with Spalart–Allmaras, k-ω SST or γ-Reθ turbulence models, in parallel over MPI, from a job queue that stops each run once it converges.

Results include force coefficients (Cd, Cl, Cm), residual plots, case comparison and a printable report. Built-in studies cover parameter sweeps, mesh independence, aircraft polars, and neutral point and static margin. PIFOAMUI is open source on GitHub under GPL-3.0: [github.com/BiscuitIV/PIFOAMUI](https://github.com/BiscuitIV/PIFOAMUI)

## A 15 A sensorless ESC, designed from scratch

The first custom PCB is the ESC, designed from scratch in KiCad to drive the 2003.5 motor on 2S to 3S at up to 15A. An STM32G0 microcontroller, powered by a TLV70433 3.3V regulator, commands an FD6288T three-phase gate driver. The driver switches six MOSFETs arranged as three half-bridges, with BAT54W bootstrap diodes supplying the high-side gates.

Commutation is sensorless. Each phase's back-EMF is scaled through a 10k/4.7k divider and compared against a virtual neutral, so the motor needs no Hall sensors. A 1mΩ shunt with an INA181A1 amplifier measures motor current, a divider measures battery voltage, and a 470µF bulk capacitor with ceramic decoupling steadies the input. The board brings out signal and telemetry pins, SWD for programming, and test points on every key net.

## Split airframe, 7-inch prop, 67% more battery energy

Generation X splits the airframe into a front body and a rear body, joined by frame plates, so each body can be streamlined without compromising the joint between them. It is built from PLA and balsa, with carbon fiber under consideration. The wing moves from the first generation's 100mm chord at 0° incidence to a 110mm chord at 5°, and each of its two halves is 486mm wide.

A 2003.5 motor on a 2S to 3S 15A ESC drives a 7-inch 7x4.5 bi-blade propeller, up from the 6-inch propeller of the first three generations. The 2S 1200mAh battery stores about 8.9Wh for 56g: roughly 67% more energy than the earlier 2S 720mAh pack for 53% more weight. Custom PCBs replace off-the-shelf boards to save weight, and a flight controller is being added for more automation.

## Nine generations, from 263g to 216g

I had never flown an RC plane when the project began, so the early generations were as much about learning to fly as about the aircraft. Every revision was crash-tested, and the rule that came out of them still drives the design: remove weight wherever it does not serve flight.

The first prototype used carbon fiber tubes for the wing and fuselage, so components could be repositioned to balance it. It was built within a month, crashed three times on a rough asphalt runway, and at 263g was already over the target; its tube fuselage lacked the stiffness to fly well.

Generations Four to Eight moved to a two-piece frame, one piece per side with the components housed inside, tested in cardboard, balsa and carbon fiber. Over those revisions a flap linkage replaced the string-and-pulley servo system, the wing mount became adjustable, a 2207 motor and 5g servos replaced the originals, and the ESC and receiver were stripped down.

The Predecessor's balsa frame finally gave the right balance of stiffness and weight, bringing the plane under 250g at 216g.

## 18% lighter, and level flight down to 7.83 m/s

Mass fell from 263g in the first generation to 216g in the Predecessor, 47g or about 18% lighter. Level flight speed was 10.1 m/s for Generation Nine and is 7.83 m/s so far for Generation X, against a cruise target of 7 m/s.

## Next: a 7 m/s cruise, a flight controller and the full payload

- **Cruise at 7 m/s.** Further aerodynamic revision to bring level flight from 7.83 m/s down to the target.
- **Flight controller.** Being added for more automation.
- **Lighter structure.** Carbon fiber is under consideration for the airframe, and custom PCBs are replacing off-the-shelf boards.
- **Payload and endurance.** Fly the 40g payload of camera, video transmitter, flight controller and GPS, and test the 30-minute endurance target.
