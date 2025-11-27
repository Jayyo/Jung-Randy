"""
Boss Platform - Dark Ritual Arena
For 정랜디 (정치인 랜덤 디펜스)

This script creates a dramatic boss arena with:
- Hexagonal stone floor with worn texture
- Glowing ritual circles with runic patterns
- Ominous corner pillars with floating crystals
- Central summoning altar
- Atmospheric fog volumes

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

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

cleanup_scene()

# ===== CONSTANTS =====
PLATFORM_SIZE = 14.0
PLATFORM_HEIGHT = 0.6
OUTER_RING_RADIUS = 6.0
MIDDLE_RING_RADIUS = 3.5
INNER_RING_RADIUS = 1.2
PILLAR_HEIGHT = 2.5
PILLAR_RADIUS = 6.5

# ===== MATERIALS =====
def create_materials():
    """Create all materials for the boss platform"""
    materials = {}

    # Dark Stone Floor
    mat = bpy.data.materials.new(name="Dark_Stone")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Principled BSDF for stone
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    noise = nodes.new('ShaderNodeTexNoise')
    color_ramp = nodes.new('ShaderNodeValToRGB')
    bump = nodes.new('ShaderNodeBump')
    tex_coord = nodes.new('ShaderNodeTexCoord')

    noise.inputs['Scale'].default_value = 15.0
    noise.inputs['Detail'].default_value = 10.0
    color_ramp.color_ramp.elements[0].color = (0.02, 0.02, 0.025, 1)
    color_ramp.color_ramp.elements[1].color = (0.08, 0.08, 0.09, 1)
    principled.inputs['Roughness'].default_value = 0.85
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

    # Glowing Ritual Circle (Blood Red)
    mat = bpy.data.materials.new(name="Ritual_Glow")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    mix = nodes.new('ShaderNodeMixShader')
    fresnel = nodes.new('ShaderNodeFresnel')

    emission.inputs['Color'].default_value = (0.8, 0.05, 0.02, 1)
    emission.inputs['Strength'].default_value = 3.0
    principled.inputs['Base Color'].default_value = (0.5, 0.02, 0.01, 1)
    principled.inputs['Roughness'].default_value = 0.3
    principled.inputs['Metallic'].default_value = 0.8
    fresnel.inputs['IOR'].default_value = 1.5

    links.new(fresnel.outputs['Fac'], mix.inputs['Fac'])
    links.new(principled.outputs['BSDF'], mix.inputs[1])
    links.new(emission.outputs['Emission'], mix.inputs[2])
    links.new(mix.outputs['Shader'], output.inputs['Surface'])

    materials['ritual'] = mat

    # Dark Obsidian Pillar
    mat = bpy.data.materials.new(name="Obsidian_Pillar")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    noise = nodes.new('ShaderNodeTexNoise')
    color_ramp = nodes.new('ShaderNodeValToRGB')

    noise.inputs['Scale'].default_value = 5.0
    color_ramp.color_ramp.elements[0].color = (0.01, 0.01, 0.015, 1)
    color_ramp.color_ramp.elements[1].color = (0.05, 0.05, 0.07, 1)
    principled.inputs['Roughness'].default_value = 0.15
    principled.inputs['Metallic'].default_value = 0.1

    links.new(noise.outputs['Fac'], color_ramp.inputs['Fac'])
    links.new(color_ramp.outputs['Color'], principled.inputs['Base Color'])
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
    glass = nodes.new('ShaderNodeBsdfGlass')
    mix = nodes.new('ShaderNodeMixShader')

    emission.inputs['Color'].default_value = (0.4, 0.1, 0.8, 1)
    emission.inputs['Strength'].default_value = 5.0
    glass.inputs['Color'].default_value = (0.6, 0.2, 0.9, 1)
    glass.inputs['Roughness'].default_value = 0.1

    links.new(glass.outputs['BSDF'], mix.inputs[1])
    links.new(emission.outputs['Emission'], mix.inputs[2])
    mix.inputs['Fac'].default_value = 0.7
    links.new(mix.outputs['Shader'], output.inputs['Surface'])

    materials['crystal'] = mat

    # Rune Engravings (Subtle Gold Glow)
    mat = bpy.data.materials.new(name="Rune_Gold")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')

    emission.inputs['Color'].default_value = (1.0, 0.7, 0.2, 1)
    emission.inputs['Strength'].default_value = 2.0

    links.new(emission.outputs['Emission'], output.inputs['Surface'])

    materials['rune'] = mat

    return materials

materials = create_materials()

# ===== GEOMETRY FUNCTIONS =====
def create_hexagonal_floor():
    """Create hexagonal tiled floor with beveled edges"""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=PLATFORM_SIZE / 2 + 0.5,
        depth=PLATFORM_HEIGHT,
        location=(0, 0, -PLATFORM_HEIGHT / 2)
    )
    floor = bpy.context.object
    floor.name = "Boss_Floor_Base"

    # Add bevel modifier for smoother edges
    bevel = floor.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.1
    bevel.segments = 3

    # Apply modifier
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

    # Create inner cylinder to boolean subtract
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments,
        radius=radius_inner,
        depth=height + 0.1,
        location=(0, 0, height / 2)
    )
    inner = bpy.context.object

    # Boolean difference
    bool_mod = outer.modifiers.new(name="Boolean", type='BOOLEAN')
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = inner

    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")

    # Delete inner cylinder
    bpy.data.objects.remove(inner, do_unlink=True)

    outer.data.materials.append(materials['ritual'])

    return outer

def create_rune_symbols(radius, count=8):
    """Create runic symbols around the circle"""
    runes = []
    for i in range(count):
        angle = (i / count) * math.pi * 2
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius

        # Create rune as extruded text or simple geometric shape
        bpy.ops.mesh.primitive_plane_add(size=0.4, location=(x, y, 0.03))
        rune = bpy.context.object
        rune.name = f"Rune_{i}"
        rune.rotation_euler.z = angle + math.pi / 2

        # Subdivide and randomize for runic look
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.transform.vertex_random(offset=0.05)
        bpy.ops.object.mode_set(mode='OBJECT')

        rune.data.materials.append(materials['rune'])
        runes.append(rune)

    return runes

def create_corner_pillar(location, rotation=0):
    """Create an ominous corner pillar with floating crystal"""
    pillar_group = []

    # Main pillar body - tapered octagonal
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.4,
        depth=PILLAR_HEIGHT,
        location=(location[0], location[1], PILLAR_HEIGHT / 2)
    )
    pillar = bpy.context.object
    pillar.name = "Pillar_Body"

    # Taper the pillar using proportional editing via bmesh
    bm = bmesh.new()
    bm.from_mesh(pillar.data)

    for v in bm.verts:
        if v.co.z > 0:
            scale = 1.0 - (v.co.z / PILLAR_HEIGHT) * 0.3
            v.co.x *= scale
            v.co.y *= scale

    bm.to_mesh(pillar.data)
    bm.free()

    pillar.data.materials.append(materials['obsidian'])
    pillar_group.append(pillar)

    # Pillar base
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.55,
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
        radius=0.35,
        depth=0.15,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.075)
    )
    cap = bpy.context.object
    cap.name = "Pillar_Cap"
    cap.data.materials.append(materials['obsidian'])
    pillar_group.append(cap)

    # Floating crystal above pillar
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=0.2,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.6)
    )
    crystal = bpy.context.object
    crystal.name = "Floating_Crystal"

    # Deform crystal for more interesting shape
    bm = bmesh.new()
    bm.from_mesh(crystal.data)
    for v in bm.verts:
        v.co.z *= 1.5  # Elongate
        noise = math.sin(v.co.x * 10) * 0.05
        v.co.x += noise
    bm.to_mesh(crystal.data)
    bm.free()

    crystal.data.materials.append(materials['crystal'])
    pillar_group.append(crystal)

    # Add point light for crystal glow
    bpy.ops.object.light_add(
        type='POINT',
        radius=0.5,
        location=(location[0], location[1], PILLAR_HEIGHT + 0.6)
    )
    light = bpy.context.object
    light.data.color = (0.6, 0.2, 0.9)
    light.data.energy = 50
    light.data.shadow_soft_size = 0.3
    light.name = "Crystal_Light"
    pillar_group.append(light)

    return pillar_group

def create_central_altar():
    """Create the central summoning altar"""
    altar_parts = []

    # Altar base - wide octagonal platform
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=1.5,
        depth=0.3,
        location=(0, 0, 0.15)
    )
    base = bpy.context.object
    base.name = "Altar_Base"
    base.data.materials.append(materials['obsidian'])
    altar_parts.append(base)

    # Middle tier
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=1.0,
        depth=0.25,
        location=(0, 0, 0.425)
    )
    mid = bpy.context.object
    mid.name = "Altar_Mid"
    mid.data.materials.append(materials['obsidian'])
    altar_parts.append(mid)

    # Top platform
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.6,
        depth=0.15,
        location=(0, 0, 0.625)
    )
    top = bpy.context.object
    top.name = "Altar_Top"
    top.data.materials.append(materials['stone'])
    altar_parts.append(top)

    # Central orb (main energy source)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=16,
        radius=0.25,
        location=(0, 0, 0.95)
    )
    orb = bpy.context.object
    orb.name = "Power_Orb"
    orb.data.materials.append(materials['ritual'])
    altar_parts.append(orb)

    # Orb light
    bpy.ops.object.light_add(
        type='POINT',
        radius=1.0,
        location=(0, 0, 0.95)
    )
    orb_light = bpy.context.object
    orb_light.data.color = (0.9, 0.1, 0.05)
    orb_light.data.energy = 100
    orb_light.data.shadow_soft_size = 0.5
    orb_light.name = "Orb_Light"
    altar_parts.append(orb_light)

    return altar_parts

def create_floor_cracks():
    """Create crack patterns on the floor for weathered look"""
    cracks = []

    for i in range(12):
        angle = (i / 12) * math.pi * 2 + 0.2
        length = 2.0 + (i % 3) * 0.5

        # Create curve for crack
        curve_data = bpy.data.curves.new(name=f"Crack_{i}", type='CURVE')
        curve_data.dimensions = '3D'

        spline = curve_data.splines.new('BEZIER')
        spline.bezier_points.add(2)

        start_r = 1.5
        end_r = start_r + length

        points = spline.bezier_points
        points[0].co = (math.cos(angle) * start_r, math.sin(angle) * start_r, 0.01)
        points[1].co = (math.cos(angle + 0.1) * (start_r + length/2), math.sin(angle + 0.1) * (start_r + length/2), 0.01)
        points[2].co = (math.cos(angle - 0.05) * end_r, math.sin(angle - 0.05) * end_r, 0.01)

        curve_data.bevel_depth = 0.02
        curve_data.bevel_resolution = 2

        crack_obj = bpy.data.objects.new(f"Crack_{i}", curve_data)
        bpy.context.collection.objects.link(crack_obj)
        crack_obj.data.materials.append(materials['ritual'])
        cracks.append(crack_obj)

    return cracks

def create_edge_decorations():
    """Create decorative edge elements around the platform"""
    decorations = []

    # Small spikes/teeth around the edge
    for i in range(24):
        angle = (i / 24) * math.pi * 2
        radius = PLATFORM_SIZE / 2 + 0.2
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius

        bpy.ops.mesh.primitive_cone_add(
            vertices=4,
            radius1=0.15,
            radius2=0,
            depth=0.4,
            location=(x, y, 0.2)
        )
        spike = bpy.context.object
        spike.name = f"Edge_Spike_{i}"
        spike.rotation_euler.z = angle
        spike.data.materials.append(materials['obsidian'])
        decorations.append(spike)

    return decorations

# ===== BUILD THE PLATFORM =====
print("Creating Boss Platform...")

# Main floor
floor = create_hexagonal_floor()

# Ritual rings
outer_ring = create_ritual_ring(OUTER_RING_RADIUS - 0.4, OUTER_RING_RADIUS)
outer_ring.name = "Ritual_Ring_Outer"

middle_ring = create_ritual_ring(MIDDLE_RING_RADIUS - 0.3, MIDDLE_RING_RADIUS)
middle_ring.name = "Ritual_Ring_Middle"

inner_ring = create_ritual_ring(INNER_RING_RADIUS - 0.2, INNER_RING_RADIUS)
inner_ring.name = "Ritual_Ring_Inner"

# Rune symbols
runes_outer = create_rune_symbols(OUTER_RING_RADIUS - 0.7, count=12)
runes_inner = create_rune_symbols(MIDDLE_RING_RADIUS - 0.5, count=6)

# Corner pillars (4 corners)
pillars = []
for i in range(4):
    angle = (i / 4) * math.pi * 2 + math.pi / 4
    x = math.cos(angle) * PILLAR_RADIUS
    y = math.sin(angle) * PILLAR_RADIUS
    pillar_parts = create_corner_pillar((x, y, 0), rotation=angle)
    pillars.extend(pillar_parts)

# Central altar
altar = create_central_altar()

# Floor cracks
cracks = create_floor_cracks()

# Edge decorations
edges = create_edge_decorations()

# ===== JOIN ALL MESHES =====
print("Joining meshes...")

# Select all mesh objects
bpy.ops.object.select_all(action='DESELECT')
mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

if mesh_objects:
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]

# ===== FINAL SETUP =====
# Apply smooth shading to all
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# Create empty parent for organization
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
parent_empty = bpy.context.object
parent_empty.name = "Boss_Platform"

# Parent all objects
for obj in bpy.context.scene.objects:
    if obj != parent_empty and obj.parent is None:
        obj.parent = parent_empty

print("Boss Platform created successfully!")
print(f"Platform size: {PLATFORM_SIZE}x{PLATFORM_SIZE} units")
print("Export as GLB for use in the game.")
