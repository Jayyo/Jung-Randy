"""
Boss Platform V2 - Dark Ritual Arena (Hexagonal Design)
For 정랜디 (정치인 랜덤 디펜스)

FIXED:
- 6 corner pillars (matching hexagonal floor)
- Edge spikes aligned to hexagon edges
- Darker materials
- Better proportions

Usage: Run in Blender's Script Editor
Output size: 14x14 units (matching game scale)
"""

import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# ===== CLEANUP =====
def cleanup_scene():
    """Remove all existing objects"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.curves:
        if block.users == 0:
            bpy.data.curves.remove(block)

cleanup_scene()

# ===== CONSTANTS =====
PLATFORM_SIZE = 14.0
PLATFORM_RADIUS = PLATFORM_SIZE / 2
PLATFORM_HEIGHT = 0.6
OUTER_RING_RADIUS = 6.0
MIDDLE_RING_RADIUS = 3.5
INNER_RING_RADIUS = 1.2
PILLAR_HEIGHT = 2.5
NUM_SIDES = 6  # Hexagon

# Calculate hexagon vertex positions
def get_hex_vertices(radius, offset_angle=0):
    """Get vertices of a hexagon"""
    vertices = []
    for i in range(NUM_SIDES):
        angle = (i / NUM_SIDES) * math.pi * 2 + offset_angle
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        vertices.append((x, y))
    return vertices

# ===== MATERIALS =====
def create_materials():
    """Create all materials for the boss platform"""
    materials = {}

    # Dark Stone Floor - MUCH DARKER
    mat = bpy.data.materials.new(name="Dark_Stone")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    noise = nodes.new('ShaderNodeTexNoise')
    color_ramp = nodes.new('ShaderNodeValToRGB')
    bump = nodes.new('ShaderNodeBump')
    tex_coord = nodes.new('ShaderNodeTexCoord')

    noise.inputs['Scale'].default_value = 15.0
    noise.inputs['Detail'].default_value = 10.0
    # Much darker colors
    color_ramp.color_ramp.elements[0].color = (0.01, 0.01, 0.015, 1)  # Almost black
    color_ramp.color_ramp.elements[1].color = (0.04, 0.04, 0.05, 1)   # Dark gray
    principled.inputs['Roughness'].default_value = 0.9
    bump.inputs['Strength'].default_value = 0.3

    links.new(tex_coord.outputs['Generated'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], color_ramp.inputs['Fac'])
    links.new(color_ramp.outputs['Color'], principled.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], principled.inputs['Normal'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    output.location = (400, 0)
    principled.location = (100, 0)
    materials['stone'] = mat

    # Glowing Ritual Circle (Blood Red) - More intense
    mat = bpy.data.materials.new(name="Ritual_Glow")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')

    emission.inputs['Color'].default_value = (0.9, 0.1, 0.02, 1)  # Bright red
    emission.inputs['Strength'].default_value = 5.0

    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    materials['ritual'] = mat

    # Dark Obsidian Pillar - Very dark
    mat = bpy.data.materials.new(name="Obsidian_Pillar")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')

    principled.inputs['Base Color'].default_value = (0.02, 0.02, 0.03, 1)  # Very dark
    principled.inputs['Roughness'].default_value = 0.2
    principled.inputs['Metallic'].default_value = 0.1

    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    materials['obsidian'] = mat

    # Floating Crystal (Purple Glow)
    mat = bpy.data.materials.new(name="Crystal_Glow")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')

    emission.inputs['Color'].default_value = (0.5, 0.1, 0.9, 1)  # Purple
    emission.inputs['Strength'].default_value = 8.0

    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    materials['crystal'] = mat

    # Rune Engravings (Gold Glow)
    mat = bpy.data.materials.new(name="Rune_Gold")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')

    emission.inputs['Color'].default_value = (1.0, 0.7, 0.2, 1)  # Gold
    emission.inputs['Strength'].default_value = 3.0

    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    materials['rune'] = mat

    return materials

materials = create_materials()

# ===== GEOMETRY FUNCTIONS =====
def create_hexagonal_floor():
    """Create hexagonal floor with beveled edges"""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=PLATFORM_RADIUS + 0.3,
        depth=PLATFORM_HEIGHT,
        location=(0, 0, -PLATFORM_HEIGHT / 2)
    )
    floor = bpy.context.object
    floor.name = "Boss_Floor_Base"

    # Rotate to align flat edge to front
    floor.rotation_euler.z = math.pi / 6  # 30 degrees

    bevel = floor.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.15
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier="Bevel")

    floor.data.materials.append(materials['stone'])
    return floor

def create_ritual_ring(radius_inner, radius_outer, height=0.02, segments=64):
    """Create a glowing ritual ring"""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments,
        radius=radius_outer,
        depth=height,
        location=(0, 0, height / 2)
    )
    outer = bpy.context.object

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments,
        radius=radius_inner,
        depth=height + 0.1,
        location=(0, 0, height / 2)
    )
    inner = bpy.context.object

    bool_mod = outer.modifiers.new(name="Boolean", type='BOOLEAN')
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")

    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials['ritual'])
    return outer

def create_hexagonal_ring(radius, thickness=0.3, height=0.02):
    """Create a hexagonal ring instead of circular"""
    # Outer hexagon
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=radius,
        depth=height,
        location=(0, 0, height / 2)
    )
    outer = bpy.context.object
    outer.rotation_euler.z = math.pi / 6

    # Inner hexagon
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=radius - thickness,
        depth=height + 0.1,
        location=(0, 0, height / 2)
    )
    inner = bpy.context.object
    inner.rotation_euler.z = math.pi / 6

    bool_mod = outer.modifiers.new(name="Boolean", type='BOOLEAN')
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")

    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials['ritual'])
    return outer

def create_rune_symbols(radius, count=6):
    """Create runic symbols - aligned to hexagon vertices"""
    runes = []
    for i in range(count):
        angle = (i / count) * math.pi * 2 + math.pi / 6  # Offset to match hex rotation
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius

        bpy.ops.mesh.primitive_plane_add(size=0.4, location=(x, y, 0.03))
        rune = bpy.context.object
        rune.name = f"Rune_{i}"
        rune.rotation_euler.z = angle + math.pi / 2

        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.transform.vertex_random(offset=0.05)
        bpy.ops.object.mode_set(mode='OBJECT')

        rune.data.materials.append(materials['rune'])
        runes.append(rune)
    return runes

def create_corner_pillar(location):
    """Create an ominous corner pillar with floating crystal"""
    pillar_group = []

    # Main pillar body - tapered octagonal
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.35,
        depth=PILLAR_HEIGHT,
        location=(location[0], location[1], PILLAR_HEIGHT / 2)
    )
    pillar = bpy.context.object
    pillar.name = "Pillar_Body"

    # Taper the pillar
    bm = bmesh.new()
    bm.from_mesh(pillar.data)
    for v in bm.verts:
        if v.co.z > 0:
            scale = 1.0 - (v.co.z / PILLAR_HEIGHT) * 0.25
            v.co.x *= scale
            v.co.y *= scale
    bm.to_mesh(pillar.data)
    bm.free()

    pillar.data.materials.append(materials['obsidian'])
    pillar_group.append(pillar)

    # Pillar base
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.5,
        depth=0.2,
        location=(location[0], location[1], 0.1)
    )
    base = bpy.context.object
    base.name = "Pillar_Base"
    base.data.materials.append(materials['obsidian'])
    pillar_group.append(base)

    # Pillar cap
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.3,
        depth=0.12,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.06)
    )
    cap = bpy.context.object
    cap.name = "Pillar_Cap"
    cap.data.materials.append(materials['obsidian'])
    pillar_group.append(cap)

    # Floating crystal
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=0.18,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.5)
    )
    crystal = bpy.context.object
    crystal.name = "Floating_Crystal"

    # Elongate crystal
    bm = bmesh.new()
    bm.from_mesh(crystal.data)
    for v in bm.verts:
        v.co.z *= 1.6
    bm.to_mesh(crystal.data)
    bm.free()

    crystal.data.materials.append(materials['crystal'])
    pillar_group.append(crystal)

    # Point light for crystal
    bpy.ops.object.light_add(
        type='POINT',
        radius=0.5,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.5)
    )
    light = bpy.context.object
    light.data.color = (0.6, 0.2, 0.9)
    light.data.energy = 30
    light.name = "Crystal_Light"
    pillar_group.append(light)

    return pillar_group

def create_central_altar():
    """Create the central summoning altar"""
    altar_parts = []

    # Altar base - hexagonal
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=1.3,
        depth=0.25,
        location=(0, 0, 0.125)
    )
    base = bpy.context.object
    base.name = "Altar_Base"
    base.rotation_euler.z = math.pi / 6
    base.data.materials.append(materials['obsidian'])
    altar_parts.append(base)

    # Middle tier
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.9,
        depth=0.2,
        location=(0, 0, 0.35)
    )
    mid = bpy.context.object
    mid.name = "Altar_Mid"
    mid.rotation_euler.z = math.pi / 6
    mid.data.materials.append(materials['obsidian'])
    altar_parts.append(mid)

    # Top platform
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.5,
        depth=0.12,
        location=(0, 0, 0.51)
    )
    top = bpy.context.object
    top.name = "Altar_Top"
    top.rotation_euler.z = math.pi / 6
    top.data.materials.append(materials['stone'])
    altar_parts.append(top)

    # Central orb
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24,
        ring_count=12,
        radius=0.22,
        location=(0, 0, 0.82)
    )
    orb = bpy.context.object
    orb.name = "Power_Orb"
    orb.data.materials.append(materials['ritual'])
    altar_parts.append(orb)

    # Orb light
    bpy.ops.object.light_add(
        type='POINT',
        radius=1.0,
        location=(0, 0, 0.82)
    )
    orb_light = bpy.context.object
    orb_light.data.color = (0.9, 0.1, 0.05)
    orb_light.data.energy = 80
    orb_light.name = "Orb_Light"
    altar_parts.append(orb_light)

    return altar_parts

def create_edge_spikes_hexagonal():
    """Create spikes along hexagon edges"""
    decorations = []
    hex_verts = get_hex_vertices(PLATFORM_RADIUS + 0.1, offset_angle=math.pi / 6)

    for i in range(NUM_SIDES):
        # Get edge start and end
        v1 = hex_verts[i]
        v2 = hex_verts[(i + 1) % NUM_SIDES]

        # Calculate edge direction and length
        edge_vec = (v2[0] - v1[0], v2[1] - v1[1])
        edge_len = math.sqrt(edge_vec[0]**2 + edge_vec[1]**2)
        edge_angle = math.atan2(edge_vec[1], edge_vec[0])

        # Place 4 spikes per edge
        spikes_per_edge = 4
        for j in range(spikes_per_edge):
            t = (j + 0.5) / spikes_per_edge
            x = v1[0] + edge_vec[0] * t
            y = v1[1] + edge_vec[1] * t

            bpy.ops.mesh.primitive_cone_add(
                vertices=4,
                radius1=0.12,
                radius2=0,
                depth=0.35,
                location=(x, y, 0.175)
            )
            spike = bpy.context.object
            spike.name = f"Edge_Spike_{i}_{j}"
            spike.data.materials.append(materials['obsidian'])
            decorations.append(spike)

    return decorations

def create_floor_cracks():
    """Create crack patterns radiating from center"""
    cracks = []

    for i in range(6):  # 6 cracks for hexagon
        angle = (i / 6) * math.pi * 2 + math.pi / 6
        length = 2.5

        curve_data = bpy.data.curves.new(name=f"Crack_{i}", type='CURVE')
        curve_data.dimensions = '3D'

        spline = curve_data.splines.new('BEZIER')
        spline.bezier_points.add(2)

        start_r = 1.5
        end_r = start_r + length

        points = spline.bezier_points
        points[0].co = (math.cos(angle) * start_r, math.sin(angle) * start_r, 0.01)
        points[1].co = (math.cos(angle + 0.08) * (start_r + length/2), math.sin(angle + 0.08) * (start_r + length/2), 0.01)
        points[2].co = (math.cos(angle - 0.05) * end_r, math.sin(angle - 0.05) * end_r, 0.01)

        curve_data.bevel_depth = 0.015
        curve_data.bevel_resolution = 2

        crack_obj = bpy.data.objects.new(f"Crack_{i}", curve_data)
        bpy.context.collection.objects.link(crack_obj)
        crack_obj.data.materials.append(materials['ritual'])
        cracks.append(crack_obj)

    return cracks

# ===== BUILD THE PLATFORM =====
print("Creating Boss Platform V2 (Hexagonal)...")

# Main floor
floor = create_hexagonal_floor()

# Ritual rings - using hexagonal rings
outer_ring = create_hexagonal_ring(OUTER_RING_RADIUS, thickness=0.35)
outer_ring.name = "Ritual_Ring_Outer"

middle_ring = create_hexagonal_ring(MIDDLE_RING_RADIUS, thickness=0.25)
middle_ring.name = "Ritual_Ring_Middle"

inner_ring = create_ritual_ring(INNER_RING_RADIUS - 0.15, INNER_RING_RADIUS)  # Inner stays circular
inner_ring.name = "Ritual_Ring_Inner"

# Rune symbols - 6 on outer, 6 on middle
runes_outer = create_rune_symbols(OUTER_RING_RADIUS - 0.6, count=6)
runes_inner = create_rune_symbols(MIDDLE_RING_RADIUS - 0.4, count=6)

# Corner pillars - 6 PILLARS for hexagon!
pillars = []
pillar_radius = PLATFORM_RADIUS - 0.5
for i in range(6):
    angle = (i / 6) * math.pi * 2 + math.pi / 6  # Match hex rotation
    x = math.cos(angle) * pillar_radius
    y = math.sin(angle) * pillar_radius
    pillar_parts = create_corner_pillar((x, y, 0))
    pillars.extend(pillar_parts)

# Central altar
altar = create_central_altar()

# Floor cracks
cracks = create_floor_cracks()

# Edge decorations - along hex edges
edges = create_edge_spikes_hexagonal()

# ===== FINAL SETUP =====
print("Applying smooth shading...")

for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# Create parent empty
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
parent_empty = bpy.context.object
parent_empty.name = "Boss_Platform_V2"

for obj in bpy.context.scene.objects:
    if obj != parent_empty and obj.parent is None:
        obj.parent = parent_empty

print("=" * 50)
print("Boss Platform V2 created successfully!")
print(f"Platform: Hexagonal, {PLATFORM_SIZE} units wide")
print(f"Pillars: {6} (one per vertex)")
print(f"Edge spikes: {6 * 4} (along hex edges)")
print("=" * 50)
print("Export as GLB: File > Export > glTF 2.0 (.glb)")
