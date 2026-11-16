// Project content: one entry per index row and project page, in drawing order (see CLAUDE.md).
// Everything after the "=" below is strict JSON so editor.html can read and rewrite it:
// no comments, trailing commas or expressions below this line.
const projects = {
    "plane": {
        "title": "Sub-250 g Endurance Plane",
        "subtitle": "LWS X, the tenth generation of my Light-Weight System",
        "outcome": "<strong>18% lighter</strong> airframe, and a wing airfoil with <strong>2.2×</strong> the lift-to-drag ratio, picked from 1,052 I simulated",
        "thumb": "lws-x/web/predecessor-thumb.jpg",
        "tags": [
            "Aero",
            "CAD",
            "Electronics",
            "Fabrication"
        ],
        "date": "2024–2026",
        "problem": "Fit a wing about one meter across, a battery and a 40 g payload under 250 g, and cruise at 7 m/s for 30 minutes",
        "role": "Personal project · design, build, flight test",
        "tools": "Onshape · KiCad · XFoil · OpenFOAM · 3D printing",
        "results": [
            [
                "−18%",
                "Lighter airframe",
                "263 g (Gen 1) → 216 g (Gen 9)"
            ],
            [
                "2.2×",
                "Higher wing lift-to-drag",
                "19.8 → 43.7, E205 → I.S.A. 960 airfoil"
            ],
            [
                "7.45 m/s",
                "Level-flight speed",
                "Gen X, down from 10.1 m/s (target 7)"
            ],
            [
                "1,052",
                "Airfoils simulated and ranked",
                "Batch XFoil 6.99 run at Re 60,000"
            ],
            [
                "15 A",
                "Custom motor controller",
                "Sensorless ESC, STM32G0, KiCad"
            ]
        ],
        "video": "",
        "image": {
            "src": "lws-x/Velocity Picture 3.png",
            "alt": "Velocity magnitude contour of the Generation X airframe",
            "caption": "CFD velocity magnitude around the Generation X airframe in level flight, OpenFOAM via PIFOAMUI"
        },
        "specs": {
            "title": "Generation X",
            "groups": [
                {
                    "group": "Airframe",
                    "rows": [
                        [
                            "Target mass",
                            "210 g (limit 250 g)"
                        ],
                        [
                            "Wingspan",
                            "972 mm (2 × 486 mm)"
                        ],
                        [
                            "Chord",
                            "110 mm"
                        ],
                        [
                            "Incidence",
                            "5°"
                        ],
                        [
                            "Materials",
                            "PLA, balsa"
                        ]
                    ]
                },
                {
                    "group": "Aerodynamics",
                    "rows": [
                        [
                            "Airfoil",
                            "I.S.A. 960"
                        ],
                        [
                            "Section Cl @ 4.75°",
                            "0.998"
                        ],
                        [
                            "Section Cd @ 4.75°",
                            "0.0228"
                        ],
                        [
                            "Section Cl/Cd",
                            "≈ 43.7"
                        ],
                        [
                            "Re @ 8 m/s",
                            "≈ 60,200"
                        ],
                        [
                            "Design Re",
                            "60,000"
                        ]
                    ]
                },
                {
                    "group": "Propulsion",
                    "rows": [
                        [
                            "Motor",
                            "2003.5"
                        ],
                        [
                            "Propeller",
                            "7×4.5 bi-blade"
                        ],
                        [
                            "ESC",
                            "2–3S, 15 A"
                        ]
                    ]
                },
                {
                    "group": "Power",
                    "rows": [
                        [
                            "Battery",
                            "Custom 2S 1200 mAh"
                        ],
                        [
                            "Voltage",
                            "7.4 V nominal"
                        ],
                        [
                            "Energy",
                            "8.9 Wh"
                        ],
                        [
                            "Mass",
                            "56 g"
                        ]
                    ]
                },
                {
                    "group": "Mission",
                    "rows": [
                        [
                            "Cruise target",
                            "7 m/s"
                        ],
                        [
                            "Level flight",
                            "7.45 m/s (current)"
                        ],
                        [
                            "Payload",
                            "≥ 40 g, ≥ 5 W"
                        ],
                        [
                            "Endurance",
                            "≥ 30 min @ 15 °C"
                        ],
                        [
                            "Altitude",
                            "0–150 m"
                        ]
                    ]
                }
            ]
        },
        "text": [
            "<strong>LWS X</strong> is a radio-controlled plane with a wingspan of about one meter that weighs under 250 grams, battery and payload included. It is the current generation of the Light-Weight System (LWS), which I have designed, built and flown since 2024.",
            "Nine generations took it from a 263 g tube glider that flew for three seconds to the 216 g Predecessor. For Generation X, I simulated 1,052 airfoils in XFoil to choose the wing section, ran OpenFOAM CFD to streamline the body, and designed my own motor controller.",
            {
                "heading": "The requirements: under 250 g, a 40 g payload and 30 minutes in the air"
            },
            "Generation X must meet the first four requirements; the rest keep it practical in the field.",
            {
                "list": [
                    "<strong>Mass</strong> under 250 g including battery and payload, 210 g target",
                    "<strong>Payload</strong> at least 40 g of electronics (camera, video transmitter, flight controller, GPS) in a protected bay, powered with at least 5 W",
                    "<strong>Endurance</strong> 30 minutes at 15°C with full payload",
                    "<strong>Flight</strong> steady cruise at about 7 m/s, launched by hand by one person",
                    "<strong>Field use</strong> battery swaps without tools in under a minute, fits in a backpack, ready to fly within five minutes, operates from 0 to 150 meters",
                    "<strong>Cost</strong> under $250 for airframe and propulsion, excluding electronics"
                ]
            },
            "I'm reviewing the regulatory and safety requirements alongside the design: FPV frequency selection, lighting for night flying, and privacy and local laws.",
            {
                "heading": "1,052 airfoils ranked: the I.S.A. 960 has 2.2× the E205's lift-to-drag"
            },
            "<strong>Design Re: 60,000.</strong> Flight testing showed level flight needs closer to 8 m/s than the 7 m/s cruise target. At 8 m/s on the 110 mm chord, Re is about 60,300 at sea level and 59,500 at 150 meters in the standard atmosphere.",
            {
                "figure": "reynolds"
            },
            "<strong>Choice: I.S.A. 960.</strong> Its best lift-to-drag ratio is 43.7, at 4.75°. That ranks it fourth of the 930 airfoils that converged in the cruise window and meet the 8 mm thickness minimum, within 3% of the top result of 45.0.",
            "The two MID 108 sections that rank higher are only 9.3 mm thick. The I.S.A. 960 is 10.4 mm thick with 5.7% camber, and it reaches its best lift-to-drag ratio inside the 0° to 5° cruise window rather than at one end of it.",
            {
                "figure": "sweep"
            },
            {
                "fold": "How the 1,052 airfoils were simulated and ranked",
                "text": [
                    "<strong>Sweep.</strong> 1,052 airfoils were run through XFoil 6.99, the panel-method solver airfoiltools.com also uses, with these settings:",
                    {
                        "list": [
                            "<strong>Sources</strong> coordinates from airfoiltools, the UIUC Airfoil Coordinates Database or the AeroSandbox database",
                            "<strong>Geometry</strong> every file converted to Selig format, and 103 blunt trailing edges closed",
                            "<strong>Solver</strong> Re 60,000, Ncrit 9, 160 panels",
                            "<strong>Sweep</strong> α −5° to 15° in 0.25° steps, 77,438 converged points",
                            "<strong>Output</strong> polars and cruise-window metrics, ranked in an interactive tool to sort, filter and compare polars"
                        ]
                    },
                    "<strong>Metric and filters.</strong> They were ranked by best lift-to-drag ratio (Cl/Cd) between 0° and 5°, the angles the wing sees in cruise with its 5° incidence. Candidates had to fall within a range of cambers and be more than 8 mm thick at the 110 mm chord, so the wing can be built from balsa and PLA with room for a spar. 1,050 converged in the cruise window, and 930 of those meet the thickness minimum.",
                    "The selection followed five steps, from operating conditions to a buildable airfoil:",
                    {
                        "list": [
                            "<strong>Reynolds number</strong> about 60,000, from level flight at 8 m/s on the 110 mm chord between 0 and 150 meters",
                            "<strong>Goal metric</strong> best Cl/Cd between 0° and 5°, the cruise window",
                            "<strong>Camber and thickness</strong> a range of cambers and a maximum thickness above 8 mm, which 930 of the converged airfoils meet",
                            "<strong>Polars at optimal angle</strong> Cl, Cl/Cd and the drag polar at each airfoil's best angle, with 1,050 ranked",
                            "<strong>Fabrication and metrics</strong> the I.S.A. 960: 10.4 mm thick, 5.7% camber, Cl/Cd 43.7 at 4.75°"
                        ]
                    }
                ]
            },
            "<strong>Versus the E205</strong> used up to Generation Nine, at each airfoil's best point in the cruise window and Re 60,000:",
            {
                "list": [
                    "<strong>Drag</strong> Cd 0.0329 → 0.0228, about 31% lower",
                    "<strong>Lift</strong> Cl 0.651 → 0.998, about 53% higher",
                    "<strong>Lift-to-drag</strong> Cl/Cd 19.8 → 43.7, about 2.2 times higher"
                ]
            },
            {
                "figure": "airfoils"
            },
            {
                "figure": "polars"
            },
            {
                "heading": "PIFOAMUI runs OpenFOAM CFD from a browser, fast enough to use between builds"
            },
            "PIFOAMUI is a browser interface I built with Claude Code for OpenFOAM 13, the open-source CFD toolkit. With it I no longer write OpenFOAM dictionaries or set up each case by hand, so I can test an aerodynamic change between builds.",
            "I used PIFOAMUI to run CFD while streamlining both bodies. So far I have simulated level flight, comparing Generation Nine with Generation X.",
            {
                "media": [
                    {
                        "src": "lws-x/front-pathlines.png",
                        "width": 1600,
                        "height": 772,
                        "alt": "Front view of the Generation X wing as a black bar, with pathlines colored by velocity from 7 to 10 m/s: air speeds up over the top of the wing and slows below it"
                    }
                ],
                "caption": "Pathlines around the Generation X wing from the front, colored by velocity magnitude: air speeds up over the wing and slows beneath it"
            },
            "PIFOAMUI is open source on GitHub under GPL-3.0: <a class=\"link\" href=\"https://github.com/BiscuitIV/PIFOAMUI\" target=\"_blank\" rel=\"noopener\">github.com/BiscuitIV/PIFOAMUI</a>",
            {
                "heading": "Two custom boards in KiCad: a 15 A motor controller and a flight controller"
            },
            "The ESC is the project's first custom PCB. I designed it in KiCad to drive the 2003.5 motor on 2S to 3S at up to 15 A.",
            "The ESC needs no Hall sensors to track the rotor. As the motor spins, each phase generates a voltage (back-EMF), and the ESC compares it with a virtual neutral point to decide when to switch phases.",
            {
                "media": [
                    {
                        "src": "lws-x/web/esc-v1-schematic.png",
                        "width": 3508,
                        "height": 2480,
                        "alt": "LWS X ESC V1 schematic: BEMF sensing, current sense, gate driver, LDO, MCU, power input, voltage sense, three half-bridges, connections and test points"
                    }
                ],
                "caption": "ESC V1 schematic in KiCad: sensing, gate driver, MCU and three half-bridges on one board · <a class=\"link\" href=\"lws-x/ESC%20V1.pdf\" target=\"_blank\" rel=\"noopener\">PDF</a>"
            },
            "The flight controller is the second custom board. An STM32F405 reads an ICM-42688-P IMU, a BMP280 barometer, an MMC5983MA magnetometer and a SAM-M10Q GPS, and logs to a microSD card. Three buck converters supply 3.3 V, 5 V and the servo rail from the battery, with separate LDOs for the IMU and GPS.",
            {
                "media": [
                    {
                        "src": "lws-x/web/fc-v1-schematic.png",
                        "width": 3508,
                        "height": 2481,
                        "alt": "LWS X FC V1 schematic: STM32F405 MCU, IMU, barometer, magnetometer, GPS, microSD, three buck converters, 3.3 V LDOs, USB-C, ELRS pads, servo and ESC ports, power LEDs and test pads"
                    }
                ],
                "caption": "FC V1 schematic in KiCad: MCU, sensors, GPS, logging and power on one board · <a class=\"link\" href=\"lws-x/FC%20V1.pdf\" target=\"_blank\" rel=\"noopener\">PDF</a>"
            },
            {
                "heading": "A two-part body, a bigger propeller and 67% more battery energy"
            },
            "<strong>Airframe.</strong> Generation X splits the airframe into a front body and a rear body, joined by frame plates, so each body can be streamlined without compromising the joint between them. It is built from PLA and balsa, and I'm considering carbon fiber.",
            {
                "media": [
                    {
                        "src": "lws-x/lws-x-cad.png",
                        "width": 1413,
                        "height": 544,
                        "alt": "CAD wireframe of LWS X: long straight wing with winglets, a split fuselage and a tail boom carrying the tail surfaces"
                    }
                ],
                "caption": "LWS X in CAD: one-metre wing and split airframe"
            },
            "<strong>Wing.</strong> The chord is 110 mm at 5° incidence, up from 100 mm at 0° in the first generation. Each half of the wing is 486 mm wide.",
            "<strong>Propulsion.</strong> A 2003.5 motor on a 2S to 3S 15 A ESC drives a 7-inch 7x4.5 bi-blade propeller, up from the 6-inch propeller of the first three generations.",
            "<strong>Power.</strong> The custom 2S 1200 mAh battery weighs 56 g and stores about 8.9 Wh. Compared with the earlier 2S 720 mAh pack, it holds roughly 67% more energy and weighs 53% more. Custom PCBs replace off-the-shelf boards to save weight, and I'm adding a flight controller for more automation.",
            {
                "media": [
                    {
                        "src": "lws-x/Airfoil.png",
                        "width": 1447,
                        "height": 675,
                        "alt": "CAD render of a wing rib with lightening cutouts"
                    }
                ],
                "caption": "Wing rib in CAD, with lightening cutouts to save weight"
            },
            {
                "heading": "Nine generations, from 263 g to 216 g"
            },
            "I had never flown an RC plane when the project began, so the early generations taught me to fly as much as they tested the aircraft, and every revision got crash-tested. I still follow the lesson they taught me: take out any weight the plane doesn't need to fly.",
            {
                "figure": "timeline"
            },
            "<strong>Gen 1 · Tube glider.</strong> At 263 g, the first prototype was already over the target. It used carbon fiber tubes for the wing and fuselage, so I could move components along them to balance it. I built it in under a month, and it crashed three times on a rough asphalt runway: the tube fuselage was too flexible to fly well.",
            {
                "media": [
                    {
                        "src": "lws-x/IMG20240903231440.jpg",
                        "width": 755,
                        "height": 1007,
                        "alt": "First-generation tube glider assembled on the floor, with 3D-printed ribs on carbon tubes, motor and landing gear"
                    },
                    {
                        "src": "lws-x/web/gen1-v1-overview.mp4",
                        "width": 720,
                        "height": 1280,
                        "alt": "Walk-around of the first-generation glider: motor, landing gear, ribs, servos and tail"
                    },
                    {
                        "src": "lws-x/web/gen1-v1-test.mp4",
                        "width": 720,
                        "height": 1280,
                        "alt": "Overhead ground test of the first-generation glider with its covered wing"
                    }
                ],
                "caption": "Generation 1, the 263 g tube glider: assembled airframe, walk-around and ground test"
            },
            "<strong>Gens 4–8 · Two-piece frame.</strong> Generations Four to Eight used a two-piece frame, one piece per side with the components inside, which I tried in cardboard, balsa and carbon fiber.",
            "Over those revisions a flap linkage replaced the string-and-pulley servo system and the wing mount became adjustable. A 2207 motor and 5 g servos replaced the originals, and I stripped down the ESC and receiver.",
            {
                "media": [
                    {
                        "src": "lws-x/IMG20250119132358.jpg",
                        "width": 755,
                        "height": 1007,
                        "alt": "Blue 3D-printed tail surface with an integrated servo mount, held in hand"
                    }
                ],
                "caption": "3D-printed tail surface with integrated servo mount, two-piece frame era, January 2025"
            },
            "<strong>Gen 9 · The Predecessor.</strong> At 216 g, it brought the plane under 250 g. Its balsa frame finally gave the right balance of stiffness and weight.",
            {
                "media": [
                    {
                        "src": "lws-x/IMG20260624213924.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "The Predecessor mid-build on a table: red-covered wing, balsa frame, printed tail parts and transmitter"
                    },
                    {
                        "src": "lws-x/IMG20260806213745.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "The Predecessor held in one hand, ready for a hand launch"
                    }
                ],
                "caption": "The Predecessor: wing and balsa frame mid-build, and ready for hand launch"
            },
            {
                "media": [
                    {
                        "src": "lws-x/web/gen9-flight.mp4",
                        "width": 1280,
                        "height": 720,
                        "alt": "Flight test of the Predecessor over a park field at dusk"
                    }
                ],
                "caption": "The Predecessor in flight"
            },
            {
                "media": [
                    {
                        "src": "lws-x/parts.jpg",
                        "width": 1600,
                        "height": 1067,
                        "alt": "Flat lay of 3D-printed parts from successive LWS generations, including frame plates, mounts and wheels"
                    }
                ],
                "caption": "3D-printed parts from successive LWS generations"
            },
            {
                "heading": "18% lighter, and level flight down to 7.45 m/s"
            },
            {
                "list": [
                    "<strong>Mass</strong> 263 g in the first generation → 216 g in the Predecessor, 47 g or about 18% lighter",
                    "<strong>Level flight</strong> 10.1 m/s for Generation Nine → 7.45 m/s so far for Generation X, against a cruise target of 7 m/s"
                ]
            },
            {
                "heading": "Next: a 7 m/s cruise, a flight controller and the full payload"
            },
            {
                "list": [
                    "<strong>Cruise at 7 m/s</strong> further aerodynamic revision to bring level flight from 7.45 m/s down to the target",
                    "<strong>Flight controller</strong> being added for more automation",
                    "<strong>Lighter structure</strong> carbon fiber under consideration for the airframe, and custom PCBs replacing off-the-shelf boards",
                    "<strong>Payload and endurance</strong> fly the 40 g payload of camera, video transmitter, flight controller and GPS, and test the 30-minute endurance target"
                ]
            }
        ]
    },
    "printer": {
        "title": "DIY 3D Printer",
        "subtitle": "A cartesian printer with an aluminum frame I milled by hand",
        "outcome": "Designed in Onshape and <strong>assembled in four months</strong>, with a custom accelerometer board that helps it print fast without ringing",
        "thumb": "across-the-years/printer-complete.jpg",
        "image": {
            "src": "across-the-years/printer-complete.jpg",
            "alt": "3D printer assembled with green printed corner brackets and feet, Raspberry Pi and control board",
            "caption": "The printer assembled with its green printed brackets and feet, March 2026; the build is paused while I am at college"
        },
        "tags": [
            "CAD",
            "Electronics",
            "Fabrication"
        ],
        "date": "2025–Now",
        "problem": "Design and build a cartesian 3D printer, and tune it to print fast without ringing",
        "role": "Personal project · design, sourcing, build",
        "tools": "Onshape · KiCad · Raspberry Pi",
        "results": [
            [
                "180 × 180 × 220",
                "Build volume, mm",
                "X × Y × Z"
            ],
            [
                "4 months",
                "Parts to assembled machine",
                "November 2025 → March 2026"
            ],
            [
                "1",
                "Custom accelerometer board",
                "Vibration Tracker V1.0, KiCad"
            ]
        ],
        "specs": {
            "title": "Hardware",
            "groups": [
                {
                    "group": "Frame",
                    "rows": [
                        [
                            "Extrusion",
                            "2020 aluminum"
                        ],
                        [
                            "Build volume",
                            "180 × 180 × 220 mm"
                        ],
                        [
                            "Build plate",
                            "Aluminum"
                        ]
                    ]
                },
                {
                    "group": "Motion",
                    "rows": [
                        [
                            "Gantry",
                            "Linear rails"
                        ],
                        [
                            "Vertical",
                            "Smooth rods, twin 8 mm lead screws"
                        ],
                        [
                            "Build plate",
                            "Smooth rods"
                        ],
                        [
                            "Belt",
                            "10 mm wide"
                        ]
                    ]
                },
                {
                    "group": "Motors",
                    "rows": [
                        [
                            "Gantry and build plate",
                            "2 × NEMA 17, 48 mm"
                        ],
                        [
                            "Vertical",
                            "2 × NEMA 17, 42 mm"
                        ]
                    ]
                },
                {
                    "group": "Toolhead",
                    "rows": [
                        [
                            "Extruder",
                            "HGX-LITE"
                        ],
                        [
                            "Hotend cooling",
                            "3010 axial fan"
                        ],
                        [
                            "Print cooling",
                            "2 × 4010 radial fans"
                        ]
                    ]
                }
            ]
        },
        "text": [
            "<strong>This 3D printer</strong> is a cartesian machine of my own design, modeled in Onshape. I sourced the parts in November 2025 and had it assembled with its printed parts by March 2026. The build paused when I started college and is still in progress.",
            {
                "heading": "An aluminum frame I milled by hand, with twin lead screws and a belt-driven gantry"
            },
            "The frame is 2020 aluminum extrusion that I milled by hand on a manual mill. Twin 8 mm lead screws lift the gantry on smooth rods, and the gantry itself runs on linear rails with a 10 mm belt. The aluminum build plate also moves on smooth rods, over a 180 × 180 × 220 mm build volume.",
            "Four NEMA 17 motors drive it: two 42 mm motors for the vertical axis, and two 48 mm motors for the gantry and build plate. The toolhead uses an HGX-LITE extruder; a 3010 axial fan cools the hotend and two 4010 radial fans cool the print. Printed brackets and feet tie the frame together, and a Raspberry Pi sits beside the main control board.",
            {
                "media": [
                    {
                        "src": "across-the-years/printer-cad.png",
                        "width": 883,
                        "height": 837,
                        "alt": "CAD line render of the 3D printer: aluminum extrusion frame, gantry, toolhead and lead screws"
                    }
                ],
                "caption": "CAD line render of the printer's aluminum extrusion frame, gantry and lead screws"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/printer-parts.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "3D printer parts laid out on a desk: black extrusions, steel rods, lead screws, four stepper motors, pulleys and hardware"
                    },
                    {
                        "src": "across-the-years/printer-first-assembly.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "First assembly of the 3D printer frame with gantry, toolhead and control boards wired on a desk"
                    }
                ],
                "caption": "From parts to first assembly: the November 2025 parts, and the frame wired up in December"
            },
            {
                "heading": "Vibration Tracker V1.0, an accelerometer board I designed to reduce ringing"
            },
            "To tune the printer's input shaping, I designed an accelerometer board in KiCad. Input shaping measures the frame's resonant frequencies and filters them out of the motion, so the printer can run faster without ringing in the prints.",
            "The board carries an SPI accelerometer and a 1.8 V regulator, and connects through six pads: 3.3 V, ground and the four SPI lines.",
            {
                "media": [
                    {
                        "src": "across-the-years/vibration-tracker-3d.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "3D view of the green Vibration Tracker V1.0 board with two mounting holes and logo"
                    },
                    {
                        "src": "across-the-years/vibration-tracker-layout.jpg",
                        "width": 1343,
                        "height": 1007,
                        "alt": "KiCad layout of the Vibration Tracker: accelerometer U1, regulator U2 and GND, CS, SCLK, MOSI, MISO and 3V3 pads"
                    }
                ],
                "caption": "Vibration Tracker V1.0, the 3D printer's accelerometer board for input-shaping resonance tuning: an SPI accelerometer and 1.8 V regulator, December 2025"
            }
        ]
    },
    "drones": {
        "title": "Competition and FPV Drones",
        "subtitle": "A tennis-ball payload for my club's S500, the FPV quads I learned on, and the first frame I designed",
        "outcome": "Our S500, carrying the tennis-ball mechanism I designed, placed <strong>3rd of 12</strong> at the 2023 STEM-ED Aero Robotics Competition. I also built two FPV quads from parts and designed my own <strong>56 g</strong> carbon fiber frame",
        "thumb": "web/aviation-club-bench.jpg",
        "image": {
            "src": "web/aviation-club-bench.jpg",
            "alt": "S500 quadcopter on a workshop bench beside a Flysky transmitter, with the payload servo wired to the rear arm",
            "caption": "The S500 on the bench, with the payload servo wired to the rear arm"
        },
        "tags": [
            "Aero",
            "CAD",
            "Electronics",
            "Fabrication"
        ],
        "date": "2023–2024",
        "problem": "Pick up and release multiple tennis balls at a time from an S500 quadcopter for competition; build, fly and debug FPV quads across three sizes; and design a lighter carbon fiber frame for one of them",
        "role": "Head of Mechanical, d.Aviation · personal FPV builds and frame design",
        "tools": "Onshape · Betaflight",
        "results": [
            [
                "3rd of 12",
                "Aero Robotics placing",
                "2023 STEM-ED competition, d.Aviation"
            ],
            [
                "2",
                "FPV quads built by hand from parts",
                "3.5-inch and 5-inch, set up and tuned in Betaflight"
            ],
            [
                "56 g",
                "Carbon fiber frame of my own design",
                "Four versions, V1 → V4"
            ]
        ],
        "text": [
            "<strong>These drones</strong> are my high school club's competition entry, a tennis-ball payload carried on an S500 quadcopter, the three FPV quads that were my first builds, and the carbon fiber frame I designed for one of them.",
            {
                "heading": "A tennis-ball payload that placed 3rd of 12"
            },
            "As Head of Mechanical at d.Aviation, I designed a mechanism, moved by a servo, that picks up and releases multiple tennis balls at a time. We placed 3rd of 12 teams at the 2023 STEM-ED Aero Robotics Competition.",
            {
                "media": [
                    {
                        "src": "web/Aviation%20Club%20Me%20Shot.jpeg",
                        "width": 1500,
                        "height": 2000,
                        "alt": "Holding the S500 with the payload mechanism fitted underneath, on a sunny competition field"
                    }
                ],
                "caption": "Carrying the S500 onto the field at the 2023 STEM-ED Aero Robotics Competition, payload fitted underneath"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/web/drone-s500-hover.mp4",
                        "width": 1280,
                        "height": 576,
                        "alt": "The d.Aviation S500 quadcopter climbing and descending over a field with a load hanging on a line"
                    }
                ],
                "caption": "The d.Aviation S500 climbing and descending over a field, with a load slung on a line below"
            },
            {
                "heading": "Two FPV quads I built from parts and tuned myself"
            },
            "FPV quads, flown through a live camera feed, were my first builds. I fly a tiny whoop, a 3.5-inch and a 5-inch.",
            "For the 3.5-inch and the 5-inch I ordered every part and assembled each quad by hand. I then configured the firmware in Betaflight and tuned the PID loops myself, and I still use Betaflight to debug them.",
            {
                "media": [
                    {
                        "src": "across-the-years/drone-quad.jpg",
                        "width": 1427,
                        "height": 951,
                        "alt": "3.5-inch carbon-frame FPV quadcopter with a strapped battery on a wooden floor"
                    }
                ],
                "caption": "The 3.5-inch quad: a carbon frame with the battery strapped on top"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/web/drone-micro-2023.mp4",
                        "width": 800,
                        "height": 360,
                        "alt": "Tiny whoop, a micro ducted quadcopter, lifting off a hallway floor"
                    }
                ],
                "caption": "The tiny whoop lifting off a hallway floor, March 2023"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/web/drone-quad-2023-12.mp4",
                        "width": 720,
                        "height": 1280,
                        "alt": "FPV quadcopter flight clip filmed in portrait, December 2023"
                    }
                ],
                "caption": "An FPV quad flight, December 2023"
            },
            {
                "heading": "A 56 g carbon fiber frame, the first airframe I designed myself"
            },
            "I modeled the frame in Onshape, built it and flew it. It replaced the old frame on my 3-inch FPV quad.",
            "I designed it to be light and strong. Stacked plates on standoffs hold the electronics, and cutouts in the plates and arms remove material the frame doesn't need for strength. Over four versions, V1 to V4, I refined the weight and the overall structure.",
            {
                "media": [
                    {
                        "src": "across-the-years/drone-frame-render-v4.jpg",
                        "width": 3840,
                        "height": 2160,
                        "alt": "Rendered blue quadcopter frame with stacked plates on dark standoffs and triangular cutouts"
                    }
                ],
                "caption": "Frame Render V4: stacked plates on standoffs, with lightening cutouts in the plates and arms"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/drone-frame-cad.png",
                        "width": 1305,
                        "height": 756,
                        "alt": "CAD line render of a quadcopter frame with stacked plates and four arms"
                    }
                ],
                "caption": "The frame in CAD: four arms under a two-plate stack"
            },
            {
                "media": [
                    {
                        "src": "across-the-years/web/drone-frame-turntable.mp4",
                        "width": 1280,
                        "height": 720,
                        "alt": "Exploded-assembly animation of the blue quadcopter frame"
                    }
                ],
                "caption": "Exploded-assembly animation of the drone frame: plates, standoffs and fasteners"
            }
        ]
    },
    "radio-dock": {
        "hidden": true,
        "title": "Radio Dock",
        "subtitle": "Paid commission to hold six Motorola T600 radios",
        "outcome": "A <strong>six-radio</strong> dock for a paying client, modeled around the radio's body from the manufacturer's photo and printed as two halves",
        "thumb": "across-the-years/radio-dock-printed.jpg",
        "image": {
            "src": "across-the-years/radio-dock-cad.png",
            "alt": "CAD line render of a radio dock for six radios, split into two halves of three pockets each",
            "caption": "CAD line render of the dock for six radios, split into two halves of three pockets each"
        },
        "tags": [
            "CAD",
            "Fabrication"
        ],
        "date": "2026",
        "problem": "Hold six Motorola T600 radios upright in one dock",
        "role": "Paid commission · design and print",
        "tools": "Onshape · 3D printing",
        "results": [
            [
                "6",
                "Radios held upright",
                "Motorola T600"
            ],
            [
                "2 × 3",
                "Pockets, printed as two halves",
                "Three radios per half"
            ]
        ],
        "text": [
            "<strong>The radio dock</strong> was a paid commission: a client asked me to design and print a dock that holds six Motorola T600 radios upright.",
            "Each pocket is modeled around the radio's body, using the manufacturer's photo as the reference for its shape. The dock is split into two halves that hold three radios each.",
            {
                "media": [
                    {
                        "src": "across-the-years/radio-dock-printed.jpg",
                        "width": 713,
                        "height": 951,
                        "alt": "Blue printed dock for six radios on a wooden table holding a green Motorola radio"
                    },
                    {
                        "src": "across-the-years/motorola-t600.webp",
                        "width": 723,
                        "height": 1280,
                        "alt": "Manufacturer product photo of the green Motorola T600 radio, side view"
                    }
                ],
                "caption": "The printed radio dock in use, April 2026, beside the manufacturer's photo of the Motorola T600 it was designed around"
            }
        ]
    }
};
