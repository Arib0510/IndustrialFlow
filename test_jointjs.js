import * as joint from 'jointjs';

const graph = new joint.dia.Graph();
const rect = new joint.shapes.standard.Rectangle({ size: { width: 100, height: 100 } });
graph.addCell(rect);

console.log("Initial angle:", rect.angle());

try {
  rect.angle(45);
  console.log("Angle after rect.angle(45):", rect.angle());
} catch(e) {
  console.log("Error using rect.angle(45):", e.message);
}

try {
  rect.rotate(90, true);
  console.log("Angle after rect.rotate(90, true):", rect.angle());
} catch(e) {
  console.log("Error using rect.rotate:", e.message);
}

try {
  rect.set('angle', 135);
  console.log("Angle after rect.set('angle', 135):", rect.get('angle'));
} catch (e) {
  console.log("Error using set:", e.message);
}
