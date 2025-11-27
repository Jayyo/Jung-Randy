"""
Material Test - GLB Export Debug
================================
Creates simple cubes with different material settings to test what works in GLB/Three.js

Export: File > Export > glTF 2.0 (.glb)
- Format: glTF Binary
- Apply Modifiers: ON
- Materials: ON
- Cameras/Lights: OFF
"""

import bpy

# Cleanup
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in (bpy.data.meshes, bpy.data.materials):
    for b in list(block):
        if b.users == 0:
            block.remove(b)

def make_mat(name, base_color, roughness=0.5, metallic=0.0,
             emission_color=None, emission_strength=0.0):
    """Simple Principled BSDF material"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")

    # Base color (RGBA)
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if emission_color:
        bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat

def create_cube(name, location, material):
    bpy.ops.mesh.primitive_cube_add(size=1.5, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)

    # Add label
    bpy.ops.object.text_add(location=(location[0], location[1], location[2] + 1.2))
    text = bpy.context.object
    text.data.body = name
    text.data.size = 0.3
    text.data.align_x = 'CENTER'
    text.rotation_euler.x = 1.5708  # 90 degrees

    return obj

# ===== TEST MATERIALS =====

# Row 1: Base colors at different brightness
materials = [
    # (name, base_color, rough, metal, emission_color, emission_strength)
    ("Gray_01", (0.1, 0.1, 0.1), 0.5, 0.0, None, 0),
    ("Gray_02", (0.2, 0.2, 0.2), 0.5, 0.0, None, 0),
    ("Gray_03", (0.3, 0.3, 0.3), 0.5, 0.0, None, 0),
    ("Gray_05", (0.5, 0.5, 0.5), 0.5, 0.0, None, 0),
    ("Gray_08", (0.8, 0.8, 0.8), 0.5, 0.0, None, 0),
]

# Row 2: Colors
materials += [
    ("Red", (0.8, 0.1, 0.1), 0.5, 0.0, None, 0),
    ("Orange", (1.0, 0.5, 0.1), 0.5, 0.0, None, 0),
    ("Purple", (0.5, 0.2, 0.8), 0.5, 0.0, None, 0),
    ("Bronze", (0.6, 0.4, 0.2), 0.4, 0.8, None, 0),
    ("Blue", (0.1, 0.3, 0.8), 0.5, 0.0, None, 0),
]

# Row 3: Emission tests
materials += [
    ("Emit_Red_1", (0.8, 0.1, 0.1), 0.5, 0.0, (1.0, 0.2, 0.1), 1.0),
    ("Emit_Red_3", (0.8, 0.1, 0.1), 0.5, 0.0, (1.0, 0.2, 0.1), 3.0),
    ("Emit_Red_5", (0.8, 0.1, 0.1), 0.5, 0.0, (1.0, 0.2, 0.1), 5.0),
    ("Emit_Red_10", (0.8, 0.1, 0.1), 0.5, 0.0, (1.0, 0.2, 0.1), 10.0),
    ("Emit_Red_20", (0.8, 0.1, 0.1), 0.5, 0.0, (1.0, 0.2, 0.1), 20.0),
]

# Row 4: Different emission colors
materials += [
    ("Emit_Orange", (1.0, 0.5, 0.1), 0.5, 0.0, (1.0, 0.5, 0.1), 5.0),
    ("Emit_Purple", (0.5, 0.2, 0.8), 0.5, 0.0, (0.6, 0.2, 1.0), 5.0),
    ("Emit_Blue", (0.2, 0.4, 1.0), 0.5, 0.0, (0.2, 0.4, 1.0), 5.0),
    ("Emit_Green", (0.2, 0.8, 0.2), 0.5, 0.0, (0.2, 1.0, 0.2), 5.0),
    ("Emit_White", (1.0, 1.0, 1.0), 0.5, 0.0, (1.0, 1.0, 1.0), 5.0),
]

# Create cubes in grid
row = 0
col = 0
for i, (name, base, rough, metal, emit, emit_str) in enumerate(materials):
    if i > 0 and i % 5 == 0:
        row += 1
        col = 0

    x = col * 2.5 - 5
    y = -row * 3

    mat = make_mat(name, base, rough, metal, emit, emit_str)
    create_cube(name, (x, y, 0), mat)
    col += 1

print("=" * 50)
print("Material Test Scene Created!")
print("=" * 50)
print("")
print("Row 1: Gray brightness (0.1 to 0.8)")
print("Row 2: Solid colors (no emission)")
print("Row 3: Red emission (strength 1 to 20)")
print("Row 4: Different emission colors (strength 5)")
print("")
print("EXPORT:")
print("1. File > Export > glTF 2.0 (.glb)")
print("2. Save as: client/public/assets/terrain/material_test.glb")
print("=" * 50)
