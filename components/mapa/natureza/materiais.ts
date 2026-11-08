// Materiais compartilhados por todos os modelos. A cor vem do `tingir` de cada
// modelo (cor por vértice); o material fica branco para não escurecer em dobro.
// A textura entra depois no campo `map` e é multiplicada pela mesma cor.

import * as THREE from "three";
import { texturaDoAtlas } from "./atlas";
import type { NomeMaterial } from "./tipos";

/** Relógio comum para o que se mexe: água, folhas ao vento. Avançado pela cena. */
export const uTempo = { value: 0 };

const BASE: Record<NomeMaterial, string> = {
  casca: "#5b4636",
  "casca-clara": "#8a7a64",
  folhagem: "#ffffff",
  neve: "#eef2f4",
  pedra: "#8a8378",
  "pedra-vermelha": "#a5583a",
  "pedra-escura": "#4d4a46",
  musgo: "#55643a",
  terra: "#6e5a42",
  cogumelo: "#b9a58a",
  carvao: "#2b2826",
  osso: "#d8cfbd",
  cacto: "#5e7a45",
  reboco: "#e8e0cf",
  tijolo: "#9a5a40",
  madeira: "#8a6a48",
  "madeira-escura": "#4e3826",
  telha: "#a4553a",
  "telha-escura": "#5b3a30",
  cantaria: "#a39a88",
  ferro: "#3a3836",
  vidro: "#2a3236",
  lona: "#d9ccae",
  palha: "#b39a62",
  petala: "#e8d36a",
  agua: "#2f6a86",
};

const cache = new Map<NomeMaterial, THREE.Material>();

export function materialDe(nome: NomeMaterial): THREE.Material {
  const pronto = cache.get(nome);
  if (pronto) return pronto;
  let m: THREE.Material;
  if (nome === "folhagem") {
    m = new THREE.MeshLambertMaterial({ map: texturaDoAtlas(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
    // Folha é fina: as duas faces recebem a luz como se olhassem para cima. Sem isso,
    // o lado de trás do cartão fica preto contra o sol.
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nobjectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.55));",
      );
      s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);");
    };
  } else if (nome === "agua") {
    m = aguaAnimada();
  } else {
    m = new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true, side: nome === "neve" ? THREE.DoubleSide : THREE.FrontSide });
    m.userData.corSugerida = BASE[nome];
  }
  cache.set(nome, m);
  return m;
}

// ---------------------------------------------------------------------------
// Água: Lambert com ondas, brilho do sol, reflexo do céu e espuma, tudo no shader.
//
// Como usar (convenção para quem monta geometria de água):
// - A cor por vértice É a cor da água (o material fica branco). Escura (#24464a,
//   #3a4b44) = água parada ou funda; clara (#c8d6d2 para cima) = espuma, água branca.
// - UV em metros: u atravessa a correnteza, v corre a favor dela. A espuma e a água
//   inclinada (queda) escorrem ao longo de +v; água escura e plana (lago, mar) só
//   ondula no espaço do mundo, então a UV dela não importa.
// - Superfície inclinada (cachoeira) corre rápido; plana e clara corre devagar.
// - Ondas somem conforme o pixel cobre mais chão: de 50 m a 20 km sem chiado.
// - uTempo.value em segundos.

const AGUA_PARS_VERTEX = /* glsl */ `
varying vec3 vAguaPos;
varying vec3 vAguaNormal;
varying vec2 vAguaUv;
`;

const AGUA_VERTEX = /* glsl */ `
{
  vec4 aMundo = vec4(transformed, 1.0);
  vec3 aNormal = objectNormal;
  #ifdef USE_INSTANCING
    aMundo = instanceMatrix * aMundo;
    aNormal = mat3(instanceMatrix) * aNormal;
  #endif
  aMundo = modelMatrix * aMundo;
  vAguaPos = aMundo.xyz;
  vAguaNormal = normalize(mat3(modelMatrix) * aNormal);
  vAguaUv = uv;
}
`;

const AGUA_PARS_FRAGMENT = /* glsl */ `
uniform float uTempo;
varying vec3 vAguaPos;
varying vec3 vAguaNormal;
varying vec2 vAguaUv;

float aHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float aRuido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), u.x), mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Inclinação (gradiente) de um mar de ondas de vários tamanhos. pe = metros por pixel:
// onda menor que o pixel some, em vez de virar chiado.
vec2 aOndas(vec2 p, float t, float pe) {
  // Quebra a regularidade: as cristas entortam devagar.
  p += (vec2(aRuido(p * 0.031), aRuido(p * 0.031 + 17.0)) - 0.5) * 9.0;
  vec2 g = vec2(0.0);
  float comp = 0.45;
  float ang = 0.4;
  for (int i = 0; i < 7; i++) {
    vec2 d = vec2(cos(ang), sin(ang));
    float k = 6.2831 / comp;
    float w = sqrt(9.8 * k);
    float fase = dot(d, p) * k - t * w;
    float some = 1.0 - smoothstep(comp * 0.12, comp * 0.5, pe);
    g += d * (k * comp * 0.011 * cos(fase) * some);
    comp *= 2.15;
    ang += 2.39;
  }
  // Ondulado fino de ruído, que mexe com o vento.
  float fino = 1.0 - smoothstep(0.08, 0.35, pe);
  vec2 q = p * 2.3 + vec2(t * 0.6, t * 0.35);
  float e = 0.15;
  float r0 = aRuido(q);
  g += vec2(aRuido(q + vec2(e, 0.0)) - r0, aRuido(q + vec2(0.0, e)) - r0) / e * 0.06 * fino;
  return g;
}
`;

const AGUA_COR = /* glsl */ `
float aPe = max(length(fwidth(vAguaPos)), 0.001);
float aLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float aClara = smoothstep(0.2, 0.62, aLum);
float aInclinada = smoothstep(0.35, 0.8, 1.0 - abs(vAguaNormal.y));
float aRapida = max(aClara, aInclinada);
// Fios de correnteza: alongados ao longo de v, escorrendo com o tempo.
float aVel = mix(1.4, 7.5, aInclinada);
vec2 aQ = vec2(vAguaUv.x * 1.3, (vAguaUv.y - uTempo * aVel) * 0.22);
vec2 aQ2 = vec2(vAguaUv.x * 3.1, (vAguaUv.y - uTempo * aVel * 1.35) * 0.55) + 5.3;
float aFios = aRuido(aQ) * 0.62 + aRuido(aQ2) * 0.38;
aFios = mix(0.5, aFios, 1.0 - smoothstep(0.4, 2.5, aPe));
float aEspuma = aClara * smoothstep(0.32, 0.7, aFios + (aClara - 0.55) * 0.55);
// Mancha grande e lenta: o mar visto de longe não fica chapado.
float aMancha = aRuido(vAguaPos.xz / 160.0 + uTempo * 0.004) * 0.6 + aRuido(vAguaPos.xz / 1400.0) * 0.4;
// Água clara fora da espuma é água aerada, cinza-esverdeada, não branca.
vec3 aFunda = mix(diffuseColor.rgb, vec3(0.3, 0.4, 0.38), aClara * 0.75) * (0.82 + 0.3 * aMancha) * mix(1.0, 0.7 + 0.6 * aFios, aRapida * (1.0 - aClara) * 0.6);
vec3 aBranca = vec3(0.86, 0.9, 0.88) * (0.8 + 0.28 * aFios);
diffuseColor.rgb = mix(aFunda, aBranca, aEspuma);
diffuseColor.a = mix(0.84, 1.0, max(aEspuma, aClara * 0.7));
`;

const AGUA_NORMAL = /* glsl */ `
vec2 aG = aOndas(vAguaPos.xz, uTempo, aPe) * (1.0 - aInclinada) * (1.0 - aEspuma * 0.7);
// Água rápida: superfície picada pelos fios.
aG += (vec2(aFios, aRuido(aQ2 * 1.7)) - 0.5) * 0.5 * aRapida;
normal = normalize(normal + (viewMatrix * vec4(-aG.x, 0.0, -aG.y, 0.0)).xyz);
`;

const AGUA_BRILHO = /* glsl */ `
{
  vec3 aV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
  float aNV = clamp(dot(normal, aV), 0.0, 1.0);
  float aFres = 0.02 + 0.98 * pow(1.0 - aNV, 5.0);
  vec3 aCeu = vec3(0.6, 0.68, 0.74);
  #if NUM_HEMI_LIGHTS > 0
    aCeu = hemisphereLights[0].skyColor * 0.45;
  #endif
  float aLisa = 1.0 - aEspuma;
  outgoingLight = mix(outgoingLight, aCeu, aFres * aLisa * 0.65);
  #if NUM_DIR_LIGHTS > 0
    vec3 aH = normalize(directionalLights[0].direction + aV);
    float aDuro = mix(320.0, 36.0, aRapida);
    float aSol = pow(max(dot(normal, aH), 0.0), aDuro) * mix(2.2, 0.35, aRapida);
    outgoingLight += directionalLights[0].color * aSol * aLisa;
  #endif
}
`;

function aguaAnimada() {
  const m = new THREE.MeshLambertMaterial({ color: "#ffffff", transparent: true, vertexColors: true, side: THREE.DoubleSide });
  m.userData.corSugerida = BASE.agua;
  m.onBeforeCompile = (s) => {
    s.uniforms.uTempo = uTempo;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", `#include <common>\n${AGUA_PARS_VERTEX}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${AGUA_VERTEX}`);
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\n${AGUA_PARS_FRAGMENT}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${AGUA_COR}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${AGUA_NORMAL}`)
      .replace("#include <opaque_fragment>", `${AGUA_BRILHO}\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "agua-arcana-1";
  return m;
}
