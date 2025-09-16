export interface Topic {
  id: string;
  name: string;
  content: {
    learn: string;
    revise: string;
  };
}

export interface Chapter {
  id: string;
  name: string;
  class: 11 | 12;
  topics: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

export const syllabusData: Subject[] = [
  {
    id: "physics",
    name: "Physics",
    chapters: [
      {
        id: "kinematics",
        name: "Kinematics",
        class: 11,
        topics: [
          {
            id: "motion-in-one-dimension",
            name: "Motion in One Dimension",
            content: {
              learn: `# Motion in One Dimension

## Introduction
Motion is one of the fundamental concepts in physics. When we describe the motion of an object, we are interested in its position, velocity, and acceleration as functions of time.

## Key Concepts

### Position and Displacement
- **Position**: The location of an object in space at a given time
- **Displacement**: The change in position of an object
  - $\\vec{s} = \\vec{r_f} - \\vec{r_i}$
  - Where $\\vec{r_f}$ is final position and $\\vec{r_i}$ is initial position

### Velocity
- **Average Velocity**: $\\vec{v_{avg}} = \\frac{\\Delta \\vec{s}}{\\Delta t}$
- **Instantaneous Velocity**: $\\vec{v} = \\lim_{\\Delta t \\to 0} \\frac{\\Delta \\vec{s}}{\\Delta t} = \\frac{d\\vec{s}}{dt}$

### Acceleration
- **Average Acceleration**: $\\vec{a_{avg}} = \\frac{\\Delta \\vec{v}}{\\Delta t}$
- **Instantaneous Acceleration**: $\\vec{a} = \\frac{d\\vec{v}}{dt} = \\frac{d^2\\vec{s}}{dt^2}$

## Kinematic Equations
For motion with constant acceleration:

1. $v = u + at$
2. $s = ut + \\frac{1}{2}at^2$
3. $v^2 = u^2 + 2as$
4. $s = \\frac{u + v}{2}t$

Where:
- $u$ = initial velocity
- $v$ = final velocity
- $a$ = acceleration
- $t$ = time
- $s$ = displacement`,
              revise: `# Motion in One Dimension - Quick Revision

## Key Formulas
- **Displacement**: $s = v_f - v_i$
- **Velocity**: $v = \\frac{ds}{dt}$
- **Acceleration**: $a = \\frac{dv}{dt}$

## Kinematic Equations (Constant Acceleration)
1. $v = u + at$
2. $s = ut + \\frac{1}{2}at^2$
3. $v^2 = u^2 + 2as$
4. $s = \\frac{u + v}{2}t$

## Important Points
- Velocity is the rate of change of displacement
- Acceleration is the rate of change of velocity
- For uniform motion: $a = 0$, so $v = constant$
- For uniformly accelerated motion: $a = constant$

## Tips
- Always define positive direction
- Pay attention to signs of velocity and acceleration
- Draw motion diagrams for complex problems`
            }
          },
          {
            id: "uniformly-accelerated-motion",
            name: "Uniformly Accelerated Motion",
            content: {
              learn: `# Uniformly Accelerated Motion

## Definition
Uniformly accelerated motion is motion in which the acceleration remains constant throughout the motion.

## Characteristics
- Acceleration $a$ is constant
- Velocity changes at a constant rate
- Common examples: free fall, motion on inclined planes

## Mathematical Analysis

### Velocity-Time Relation
Starting from $a = \\frac{dv}{dt} = constant$

Integrating: $v = u + at$

### Position-Time Relation
From $v = \\frac{ds}{dt} = u + at$

Integrating: $s = ut + \\frac{1}{2}at^2$

### Velocity-Position Relation
From $v\\frac{dv}{ds} = a$

Integrating: $v^2 = u^2 + 2as$

## Graphical Representation
- **Position-Time Graph**: Parabolic curve
- **Velocity-Time Graph**: Straight line
- **Acceleration-Time Graph**: Horizontal line

## Applications
1. **Free Fall**: $a = g = 9.8 \\text{ m/s}^2$ (downward)
2. **Projectile Motion**: Horizontal and vertical components
3. **Motion on Inclined Planes**: $a = g\\sin\\theta$`,
              revise: `# Uniformly Accelerated Motion - Revision

## Key Points
- **Constant acceleration**: $a = \\text{constant}$
- **Linear velocity change**: $v = u + at$
- **Quadratic displacement**: $s = ut + \\frac{1}{2}at^2$

## Graphs
- **s-t**: Parabola
- **v-t**: Straight line
- **a-t**: Horizontal line

## Common Cases
- **Free fall**: $a = g$
- **Projectile**: $a_x = 0$, $a_y = -g$
- **Incline**: $a = g\\sin\\theta$`
            }
          },
          {
            id: "thermodynamics",
            name: "Thermodynamics",
            class: 11,
            topics: [
              {
                id: "thermodynamic-terms",
                name: "THERMODYNAMIC TERMS",
                content: {
                  learn: `# Thermodynamic Terms

## Introduction
Thermodynamics is the branch of physics that deals with heat, work, and energy transformations.

## Key Concepts

### System and Surroundings
- **System**: The part of the universe under study
- **Surroundings**: Everything else outside the system
- **Boundary**: The surface separating system from surroundings

### Types of Systems
1. **Open System**: Can exchange both matter and energy with surroundings
2. **Closed System**: Can exchange energy but not matter with surroundings
3. **Isolated System**: Cannot exchange matter or energy with surroundings

### State Variables
- **Intensive Properties**: Independent of system size (temperature, pressure, density)
- **Extensive Properties**: Depend on system size (mass, volume, energy)

### Thermodynamic Processes
- **Isothermal**: Constant temperature
- **Isobaric**: Constant pressure
- **Isochoric**: Constant volume
- **Adiabatic**: No heat exchange`,
                  revise: `# Thermodynamic Terms - Quick Review

## System Types
- **Open**: Matter + Energy exchange
- **Closed**: Energy only exchange
- **Isolated**: No exchange

## Properties
- **Intensive**: T, P, ρ (independent of size)
- **Extensive**: m, V, E (depends on size)

## Processes
- Isothermal: T = constant
- Isobaric: P = constant
- Isochoric: V = constant
- Adiabatic: Q = 0`
                }
              },
              {
                id: "thermodynamic-processes",
                name: "THERMODYNAMIC PROCESSES",
                content: {
                  learn: `# Thermodynamic Processes

## Introduction
A thermodynamic process is a change in the state of a system from one equilibrium state to another.

## Types of Processes

### 1. Isothermal Process
- **Definition**: Process occurring at constant temperature
- **Characteristics**: ΔT = 0
- **Work Done**: W = nRT ln(V₂/V₁)
- **Heat Exchange**: Q = W (for ideal gas)

### 2. Isobaric Process
- **Definition**: Process occurring at constant pressure
- **Characteristics**: ΔP = 0
- **Work Done**: W = PΔV
- **Heat Exchange**: Q = ΔH (enthalpy change)

### 3. Isochoric Process
- **Definition**: Process occurring at constant volume
- **Characteristics**: ΔV = 0
- **Work Done**: W = 0
- **Heat Exchange**: Q = ΔU (internal energy change)

### 4. Adiabatic Process
- **Definition**: Process with no heat exchange
- **Characteristics**: Q = 0
- **Work Done**: W = -ΔU
- **Temperature Change**: T₁V₁^(γ-1) = T₂V₂^(γ-1)`,
                  revise: `# Thermodynamic Processes - Summary

## Process Types
1. **Isothermal**: T = constant, W = nRT ln(V₂/V₁)
2. **Isobaric**: P = constant, W = PΔV
3. **Isochoric**: V = constant, W = 0
4. **Adiabatic**: Q = 0, W = -ΔU

## Key Equations
- Isothermal: PV = constant
- Adiabatic: PV^γ = constant
- Isobaric: V/T = constant
- Isochoric: P/T = constant`
                }
              }
            ]
          }
        ]
      },
      {
        id: "chemical-bonding",
        name: "Chemical Bonding",
        class: 12,
        topics: [
          {
            id: "ionic-bonding",
            name: "Ionic Bonding",
            content: {
              learn: `# Ionic Bonding

## Introduction
Ionic bonding occurs between atoms when electrons are transferred from one atom to another, creating charged ions that attract each other.

## Formation Process
1. **Electron Transfer**: Metal atoms lose electrons, non-metal atoms gain electrons
2. **Ion Formation**: 
   - Cations: Positively charged ions (metals)
   - Anions: Negatively charged ions (non-metals)
3. **Electrostatic Attraction**: Opposite charges attract

## Characteristics
- **High melting and boiling points**
- **Conduct electricity when molten or dissolved**
- **Brittle nature**
- **Soluble in polar solvents**

## Lattice Energy
The energy required to completely separate one mole of an ionic crystal into gaseous ions.

$$U = k \\frac{q_1 q_2}{r}$$

Where:
- $k$ = proportionality constant
- $q_1, q_2$ = charges on ions
- $r$ = distance between ion centers`,
              revise: `# Ionic Bonding - Quick Review

## Key Points
- **Electron transfer** from metal to non-metal
- **Electrostatic attraction** between ions
- **High melting points**, **conduct when molten**

## Properties
- Brittle
- Soluble in water
- High lattice energy

## Lattice Energy: $U \\propto \\frac{q_1 q_2}{r}$`
            }
          }
        ]
      }
    ]
  },
  {
    id: "chemistry",
    name: "Chemistry",
    chapters: [
      {
        id: "atomic-structure",
        name: "Atomic Structure",
        class: 11,
        topics: [
          {
            id: "quantum-numbers",
            name: "Quantum Numbers",
            content: {
              learn: `# Quantum Numbers

## Introduction
Quantum numbers are sets of numerical values that describe the energy states and spatial distribution of electrons in atoms.

## The Four Quantum Numbers

### 1. Principal Quantum Number (n)
- Describes the **energy level** or **shell**
- Values: $n = 1, 2, 3, 4, ...$
- Higher n = higher energy, larger orbital

### 2. Azimuthal Quantum Number (l)
- Describes the **shape** of the orbital
- Values: $l = 0, 1, 2, ..., (n-1)$
- **Subshells**: s(l=0), p(l=1), d(l=2), f(l=3)

### 3. Magnetic Quantum Number (m_l)
- Describes the **orientation** of orbital in space
- Values: $m_l = -l, -l+1, ..., 0, ..., l-1, l$
- Total orbitals in subshell = $2l + 1$

### 4. Spin Quantum Number (m_s)
- Describes the **spin** of electron
- Values: $m_s = +\\frac{1}{2}$ or $-\\frac{1}{2}$

## Pauli Exclusion Principle
No two electrons in an atom can have the same set of four quantum numbers.

## Maximum Electrons
- In shell: $2n^2$
- In subshell: $2(2l + 1)$`,
              revise: `# Quantum Numbers - Summary

## Four Quantum Numbers
1. **n**: Energy level (1,2,3,...)
2. **l**: Shape (0 to n-1)
3. **m_l**: Orientation (-l to +l)
4. **m_s**: Spin (±1/2)

## Key Rules
- **Pauli Exclusion**: No two electrons with same 4 quantum numbers
- **Max electrons**: Shell = $2n^2$, Subshell = $2(2l+1)$

## Subshells
- s: l=0, 2 electrons
- p: l=1, 6 electrons  
- d: l=2, 10 electrons
- f: l=3, 14 electrons`
            }
          }
        ]
      }
    ]
  },
  {
    id: "mathematics",
    name: "Mathematics",
    chapters: [
      {
        id: "calculus",
        name: "Calculus",
        class: 12,
        topics: [
          {
            id: "derivatives",
            name: "Derivatives",
            content: {
              learn: `# Derivatives

## Definition
The derivative of a function represents the rate of change of the function with respect to its variable.

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

## Basic Rules

### Power Rule
$$\\frac{d}{dx}[x^n] = nx^{n-1}$$

### Product Rule
$$\\frac{d}{dx}[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)$$

### Quotient Rule
$$\\frac{d}{dx}\\left[\\frac{f(x)}{g(x)}\\right] = \\frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}$$

### Chain Rule
$$\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$$

## Common Derivatives
- $\\frac{d}{dx}[\\sin x] = \\cos x$
- $\\frac{d}{dx}[\\cos x] = -\\sin x$
- $\\frac{d}{dx}[e^x] = e^x$
- $\\frac{d}{dx}[\\ln x] = \\frac{1}{x}$

## Applications
- Finding tangent lines
- Optimization problems
- Related rates
- Motion analysis`,
              revise: `# Derivatives - Quick Reference

## Definition
$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

## Key Rules
- **Power**: $(x^n)' = nx^{n-1}$
- **Product**: $(fg)' = f'g + fg'$
- **Quotient**: $(f/g)' = \\frac{f'g - fg'}{g^2}$
- **Chain**: $(f(g))' = f'(g) \\cdot g'$

## Common Derivatives
- $(\\sin x)' = \\cos x$
- $(\\cos x)' = -\\sin x$
- $(e^x)' = e^x$
- $(\\ln x)' = 1/x$`
            }
          }
        ]
      }
    ]
  }
];

export const getQuestionBank = () => [
  {
    topicId: "motion-in-one-dimension",
    questions: [
      {
        id: "q1",
        question: "A car accelerates from rest at 2 m/s² for 5 seconds. What is its final velocity?",
        options: [
          "8 m/s",
          "10 m/s", 
          "12 m/s",
          "15 m/s"
        ],
        correctAnswer: 1,
        explanation: "Using v = u + at, where u = 0, a = 2 m/s², t = 5s. Therefore v = 0 + 2×5 = 10 m/s"
      },
      {
        id: "q2", 
        question: "If an object moves with constant velocity, its acceleration is:",
        options: [
          "Positive",
          "Negative",
          "Zero", 
          "Cannot be determined"
        ],
        correctAnswer: 2,
        explanation: "When velocity is constant, there is no change in velocity with time, so acceleration = 0"
      }
    ]
  },
  {
    topicId: "ionic-bonding",
    questions: [
      {
        id: "q3",
        question: "Which of the following best describes ionic bonding?",
        options: [
          "Sharing of electrons between atoms",
          "Transfer of electrons from metal to non-metal",
          "Attraction between molecules", 
          "Movement of electrons in a sea"
        ],
        correctAnswer: 1,
        explanation: "Ionic bonding involves the complete transfer of electrons from metal atoms to non-metal atoms, forming ions that attract each other"
      }
    ]
  },
  {
    topicId: "quantum-numbers",
    questions: [
      {
        id: "q4",
        question: "What is the maximum number of electrons that can be accommodated in the d subshell?",
        options: [
          "2",
          "6", 
          "10",
          "14"
        ],
        correctAnswer: 2,
        explanation: "For d subshell, l = 2, so maximum electrons = 2(2l+1) = 2(2×2+1) = 2×5 = 10 electrons"
      }
    ]
  },
  {
    topicId: "derivatives",
    questions: [
      {
        id: "q5",
        question: "What is the derivative of sin(x)?",
        options: [
          "-cos(x)",
          "cos(x)",
          "-sin(x)",
          "tan(x)"
        ],
        correctAnswer: 1,
        explanation: "The derivative of sin(x) is cos(x). This is a fundamental derivative in calculus."
      }
    ]
  }
];