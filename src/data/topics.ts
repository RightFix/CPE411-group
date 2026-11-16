import topicsJson from "./topics.json";

export type Topic = { id: number; title: string; subtopics: string[] };

export const topics = topicsJson as Topic[];
