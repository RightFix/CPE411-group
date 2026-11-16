import groupsJson from "./groups.json" with { type: "json" };

export type Student = { sn: number; name: string; regNo: string };
export type Group = { id: number; name: string; students: Student[] };

export const groups = groupsJson as Group[];
