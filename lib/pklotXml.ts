export type PklotSpace = {
  id: number;
  points: { x: number; y: number }[];
  bbox: { x: number; y: number; width: number; height: number };
  groundTruth?: "Occupied" | "Empty";
};

export function parsePklotXml(xmlText: string): PklotSpace[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("XML_INVALID");
  }

  const spaces: PklotSpace[] = [];

  doc.querySelectorAll("space").forEach((spaceEl) => {
    const id = parseInt(spaceEl.getAttribute("id") ?? "0", 10);
    const occupiedAttr = spaceEl.getAttribute("occupied");
    let groundTruth: PklotSpace["groundTruth"];
    if (occupiedAttr === "1") groundTruth = "Occupied";
    else if (occupiedAttr === "0") groundTruth = "Empty";

    const points: { x: number; y: number }[] = [];
    spaceEl.querySelectorAll("contour point, contour > point").forEach((pt) => {
      const x = parseFloat(pt.getAttribute("x") ?? "0");
      const y = parseFloat(pt.getAttribute("y") ?? "0");
      points.push({ x, y });
    });

    if (points.length < 3) return;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;

    if (width < 2 || height < 2) return;

    spaces.push({ id, points, bbox: { x, y, width, height }, groundTruth });
  });

  if (spaces.length === 0) {
    throw new Error("XML_NO_SPACES");
  }

  return spaces;
}
