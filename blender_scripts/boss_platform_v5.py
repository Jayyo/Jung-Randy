"""
Boss Platform V5 - Clean & Visible
==================================
- Simplified design (no chains, no lava cracks, no rune beams)
- Brighter materials that are actually visible
- GLB-safe (Principled BSDF only)

Export: File > Export > glTF 2.0 (.glb)
- Format: glTF Binary
- Apply Modifiers: ON
- Materials: ON
- Cameras/Lights: OFF
"""

import bpy
import bmesh
import math
import random

random.seed(42)

# ===== CLEANUP =====
def cleanup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

cleanup()

# ===== CONSTANTS =====
NUM_SIDES = 6
PLATFORM_RADIUS = 7.0
PLATFORM_HEIGHT = 0.5
PILLAR_HEIGHT = 3.0
PILLAR_RADIUS = 0.35

# ===== MATERIALS (Brighter, visible colors) =====
def make_mat(name, color, rough=0.5, metal=0.0, emission=None, emission_strength=0.0):
    """Simple PBR material - GLB compatible"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal

    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat

# Dark fantasy colors with LOW emission (ReinhardToneMapping compatible)
mats = {
    # Floor - dark gray stone (visible against black bg)
    "floor": make_mat("Floor_Stone", (0.35, 0.32, 0.38), rough=0.85),

    # Pillars - dark obsidian with slight purple
    "obsidian": make_mat("Obsidian", (0.25, 0.22, 0.30), rough=0.3, metal=0.1),

    # Metal parts - aged bronze
    "metal": make_mat("Dark_Metal", (0.45, 0.35, 0.25), rough=0.4, metal=0.8),

    # Ritual rings - RED GLOW (low strength to preserve color)
    "ritual": make_mat("Ritual_Glow", (0.9, 0.2, 0.1), rough=0.3,
                       emission=(1.0, 0.15, 0.05), emission_strength=2.0),

    # Fire - ORANGE GLOW
    "fire": make_mat("Fire", (1.0, 0.5, 0.15), rough=0.5,
                     emission=(1.0, 0.4, 0.1), emission_strength=2.5),

    # Crystal - PURPLE GLOW
    "crystal": make_mat("Crystal", (0.6, 0.3, 0.9), rough=0.2,
                        emission=(0.5, 0.2, 1.0), emission_strength=2.0),

    # Altar top - dark ritual stone
    "altar": make_mat("Altar_Stone", (0.2, 0.15, 0.22), rough=0.7),

    # Spikes - sharp black stone
    "spike": make_mat("Spike", (0.18, 0.15, 0.2), rough=0.8),

    # Skulls - pale bone
    "bone": make_mat("Bone", (0.7, 0.65, 0.55), rough=0.6),

    # Soul orb - fiery orange
    "soul": make_mat("Soul_Orb", (1.0, 0.4, 0.1), rough=0.2,
                     emission=(1.0, 0.35, 0.1), emission_strength=3.0),
}

# ===== GEOMETRY =====

def create_floor():
    """Hexagonal floor platform"""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=PLATFORM_RADIUS,
        depth=PLATFORM_HEIGHT,
        location=(0, 0, -PLATFORM_HEIGHT / 2)
    )
    obj = bpy.context.object
    obj.name = "Floor"
    obj.rotation_euler.z = math.pi / 6  # Flat top

    # Bevel edges
    bevel = obj.modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier="Bevel")

    obj.data.materials.append(mats["floor"])
    return obj

def create_ritual_ring(radius, thickness=0.12):
    """Glowing ritual ring (torus)"""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius,
        minor_radius=thickness,
        major_segments=48,
        minor_segments=12,
        location=(0, 0, 0.02)
    )
    obj = bpy.context.object
    obj.name = f"Ritual_Ring_{radius:.1f}"
    obj.data.materials.append(mats["ritual"])
    return obj

def create_pillar(x, y, index):
    """Single pillar with crystal on top"""
    parts = []

    # Main shaft
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=PILLAR_RADIUS,
        depth=PILLAR_HEIGHT,
        location=(x, y, PILLAR_HEIGHT / 2)
    )
    shaft = bpy.context.object
    shaft.name = f"Pillar_{index}"

    # Taper top slightly
    bm = bmesh.new()
    bm.from_mesh(shaft.data)
    for v in bm.verts:
        if v.co.z > 0:
            t = v.co.z / PILLAR_HEIGHT
            scale = 1.0 - 0.15 * t
            v.co.x *= scale
            v.co.y *= scale
    bm.to_mesh(shaft.data)
    bm.free()

    shaft.data.materials.append(mats["obsidian"])
    parts.append(shaft)

    # Base (wider)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=PILLAR_RADIUS * 1.5,
        depth=0.2,
        location=(x, y, 0.1)
    )
    base = bpy.context.object
    base.name = f"Pillar_Base_{index}"
    base.data.materials.append(mats["obsidian"])
    parts.append(base)

    # Capital (top ring)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=PILLAR_RADIUS * 1.2,
        depth=0.12,
        location=(x, y, PILLAR_HEIGHT - 0.06)
    )
    cap = bpy.context.object
    cap.name = f"Pillar_Cap_{index}"
    cap.data.materials.append(mats["obsidian"])
    parts.append(cap)

    # Brazier bowl
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
        radius1=0.3,
        radius2=0.2,
        depth=0.2,
        location=(x, y, PILLAR_HEIGHT + 0.1)
    )
    brazier = bpy.context.object
    brazier.name = f"Brazier_{index}"
    brazier.data.materials.append(mats["metal"])
    parts.append(brazier)

    # Fire in brazier
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=8,
        radius=0.15,
        location=(x, y, PILLAR_HEIGHT + 0.25)
    )
    fire = bpy.context.object
    fire.name = f"Fire_{index}"
    fire.data.materials.append(mats["fire"])
    parts.append(fire)

    # Floating crystal above
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=0.12,
        location=(x, y, PILLAR_HEIGHT + 0.55)
    )
    crystal = bpy.context.object
    crystal.name = f"Crystal_{index}"
    # Stretch for crystal shape
    crystal.scale = (0.7, 0.7, 1.4)
    bpy.ops.object.transform_apply(scale=True)
    crystal.data.materials.append(mats["crystal"])
    parts.append(crystal)

    return parts

def create_altar():
    """Central altar with fire pillar"""
    parts = []

    # Base tier (hex)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=1.2, depth=0.25,
        location=(0, 0, 0.125)
    )
    base = bpy.context.object
    base.name = "Altar_Base"
    base.rotation_euler.z = math.pi / 6
    base.data.materials.append(mats["obsidian"])
    parts.append(base)

    # Middle tier
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.8, depth=0.2,
        location=(0, 0, 0.35)
    )
    mid = bpy.context.object
    mid.name = "Altar_Mid"
    mid.rotation_euler.z = math.pi / 6
    mid.data.materials.append(mats["obsidian"])
    parts.append(mid)

    # Top platform
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.5, depth=0.1,
        location=(0, 0, 0.5)
    )
    top = bpy.context.object
    top.name = "Altar_Top"
    top.rotation_euler.z = math.pi / 6
    top.data.materials.append(mats["altar"])
    parts.append(top)

    # Fire pillar
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, radius=0.12, depth=1.2,
        location=(0, 0, 1.15)
    )
    fire_pillar = bpy.context.object
    fire_pillar.name = "Fire_Pillar"
    fire_pillar.data.materials.append(mats["fire"])
    parts.append(fire_pillar)

    # Soul orb at top
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=12, radius=0.2,
        location=(0, 0, 1.9)
    )
    orb = bpy.context.object
    orb.name = "Soul_Orb"
    orb.data.materials.append(mats["soul"])
    parts.append(orb)

    return parts

def create_edge_spikes():
    """Spikes along hexagon edges"""
    spikes = []

    for edge in range(6):
        angle1 = math.pi / 6 + edge * math.pi / 3
        angle2 = math.pi / 6 + (edge + 1) * math.pi / 3

        x1 = PLATFORM_RADIUS * math.cos(angle1)
        y1 = PLATFORM_RADIUS * math.sin(angle1)
        x2 = PLATFORM_RADIUS * math.cos(angle2)
        y2 = PLATFORM_RADIUS * math.sin(angle2)

        # 3 spikes per edge
        for i in range(3):
            t = (i + 1) / 4
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t

            # Pull slightly inward
            dist = math.sqrt(x*x + y*y)
            x = x * (dist - 0.3) / dist
            y = y * (dist - 0.3) / dist

            bpy.ops.mesh.primitive_cone_add(
                vertices=6,
                radius1=0.1,
                radius2=0.0,
                depth=0.4,
                location=(x, y, 0.2)
            )
            spike = bpy.context.object
            spike.name = f"Spike_{edge}_{i}"
            spike.data.materials.append(mats["spike"])
            spikes.append(spike)

    return spikes

def create_skulls(count=8):
    """Scattered small skulls"""
    skulls = []

    for i in range(count):
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(2.5, 5.0)
        x = r * math.cos(angle)
        y = r * math.sin(angle)

        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=0.08,  # Smaller skulls
            location=(x, y, 0.05)
        )
        skull = bpy.context.object
        skull.name = f"Skull_{i}"
        skull.scale = (1.0, 0.8, 0.85)
        bpy.ops.object.transform_apply(scale=True)
        skull.data.materials.append(mats["bone"])
        skulls.append(skull)

    return skulls

def create_demon_horns():
    """Small horns around altar"""
    horns = []

    for i in range(6):
        angle = i * math.pi / 3 + math.pi / 6
        r = 0.9
        x = r * math.cos(angle)
        y = r * math.sin(angle)

        bpy.ops.mesh.primitive_cone_add(
            vertices=6,
            radius1=0.06,
            radius2=0.0,
            depth=0.35,
            location=(x, y, 0.55)
        )
        horn = bpy.context.object
        horn.name = f"Horn_{i}"
        # Tilt outward
        horn.rotation_euler.x = 0.4 * math.sin(angle)
        horn.rotation_euler.y = -0.4 * math.cos(angle)
        horn.data.materials.append(mats["spike"])
        horns.append(horn)

    return horns

# ===== BUILD =====
print("Creating Boss Platform V5...")

# Floor
floor = create_floor()

# Ritual rings (3 concentric)
ring1 = create_ritual_ring(5.5, 0.1)
ring2 = create_ritual_ring(3.5, 0.08)
ring3 = create_ritual_ring(1.8, 0.06)

# Pillars at hex vertices
pillars = []
for i in range(6):
    angle = i * math.pi / 3  # 0, 60, 120, 180, 240, 300 degrees
    r = PLATFORM_RADIUS - 0.7
    x = r * math.cos(angle)
    y = r * math.sin(angle)
    pillars.extend(create_pillar(x, y, i))

# Central altar
altar = create_altar()

# Edge spikes
spikes = create_edge_spikes()

# Scattered skulls
skulls = create_skulls(8)

# Demon horns around altar
horns = create_demon_horns()

# Smooth shading
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# Parent everything to empty
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
root = bpy.context.object
root.name = "Boss_Platform_V5"

for obj in bpy.context.scene.objects:
    if obj != root and obj.parent is None:
        obj.parent = root

print("=" * 50)
print("Boss Platform V5 Complete!")
print("=" * 50)
print("")
print("EXPORT:")
print("1. File > Export > glTF 2.0 (.glb)")
print("2. Format: glTF Binary")
print("3. Apply Modifiers: ON")
print("4. Materials: ON")
print("5. Cameras/Lights: OFF")
print("6. Save: client/public/assets/terrain/boss_platform.glb")
print("=" * 50)
