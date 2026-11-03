import * as THREE from "three";

export function etiqueta(texto: string, escala = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 56;
  const c = canvas.getContext("2d")!;
  c.font = "bold 30px Georgia, serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineWidth = 7;
  c.strokeStyle = "rgba(0,0,0,0.9)";
  c.strokeText(texto, 160, 28, 304);
  c.fillStyle = "#fff";
  c.fillText(texto, 160, 28, 304);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(11.4 * escala, 2 * escala, 1);
  sprite.renderOrder = 10;
  return sprite;
}
