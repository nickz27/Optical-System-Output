export default {
  LightPipe: {
    label: "Light Pipe",
    factors: [
      { key: "type",     label: "Type",      source: "inline",
        choices: { Single: { min: 0.40, max: 0.50 }, Double: { min: 0.45, max: 0.55 } } },
      { key: "material", label: "Material",  source: "materials" },
      { key: "texture",  label: "Texture",   source: "textures" },
      { key: "lengthMm", label: "Length (mm)", input: "number", min: 0, step: 1 }
    ],
    rule: "LightPipe"
  }
};
