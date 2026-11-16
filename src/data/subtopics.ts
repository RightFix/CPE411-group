export type Role = "presenter" | "research" | "slides";

export type Subtopic = {
  id: string;
  letter: string;
  short: string;
  full: string;
};

export const roles: { id: Role; label: string; limit: number }[] = [
  { id: "presenter", label: "Presenter", limit: 1 },
  { id: "research", label: "Researcher", limit: 3 },
  { id: "slides", label: "Slide Creator", limit: 3 },
];

export const subtopics: Subtopic[] = [
  {
    id: "a",
    letter: "a",
    short: "Definition & Characteristics",
    full: "Definition and characteristics of embedded systems.",
  },
  {
    id: "b",
    letter: "b",
    short: "MPU vs. MCU",
    full: "Classification: Microprocessors (MPU) vs. Microcontrollers (MCU).",
  },
  {
    id: "c",
    letter: "c",
    short: "Application Domains",
    full: "Application domains: Consumer electronics, automotive, industrial automation, IoT, and medical devices.",
  },
  {
    id: "d",
    letter: "d",
    short: "Design Flow",
    full: "Overview of the embedded system design flow (Specification → Design → Implementation → Testing).",
  },
  {
    id: "e",
    letter: "e",
    short: "General-Purpose vs. Embedded",
    full: "Guardrail: Differentiate clearly between general-purpose computing (PCs) and embedded computing constraints (power, cost, real-time).",
  },
];

export const TOTAL_SEATS = subtopics.length * roles.reduce((s, r) => s + r.limit, 0);
