"""
Boss Platform V3 - Dark Ritual Arena (Hexagonal, Diablo style)
For 정랜디 (정치인 랜덤 디펜스)

Changes:
- 6 pillars on hex vertices (precise angles)
- Hex-edge spikes and chains between pillars
- Much darker materials (stone / obsidian / dark metal)
- Diablo-style set dressing: braziers with fire, central fire pillar, skull scatter,
  rune beams, demon horns, triple ritual rings.
"""

import bpy
import bmesh
import math
import random
from mathutils import Vector

random.seed(42)

# ===== CLEANUP =====
def cleanup_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

cleanup_scene()

# ===== CONSTANTS =====
PLATFORM_SIZE = 14.0
PLATFORM_RADIUS = PLATFORM_SIZE / 2
PLATFORM_HEIGHT = 0.6
OUTER_RING_RADIUS = 6.0
MIDDLE_RING_RADIUS = 3.5
INNER_RING_RADIUS = 1.4
PILLAR_HEIGHT = 2.5
NUM_SIDES = 6
PILLAR_RADIUS_POS = PLATFORM_RADIUS - 0.5

# ===== MATERIALS =====
def create_materials():
    mats = {}

    # Dark stone (floor/top surfaces)
    mat = bpy.data.materials.new("Dark_Stone")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")
    tex = nodes.new("ShaderNodeTexCoord")
    noise.inputs["Scale"].default_value = 12
    noise.inputs["Detail"].default_value = 8
    ramp.color_ramp.elements[0].color = (0.05, 0.045, 0.04, 1)
    ramp.color_ramp.elements[1].color = (0.08, 0.07, 0.06, 1)
    bsdf.inputs["Roughness"].default_value = 0.92
    bump.inputs["Strength"].default_value = 0.35
    links.new(tex.outputs["Generated"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["stone"] = mat

    # Obsidian (pillars, spikes)
    mat = bpy.data.materials.new("Obsidian")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    bsdf = n.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.025, 1)
    bsdf.inputs["Roughness"].default_value = 0.25
    bsdf.inputs["Metallic"].default_value = 0.05
    l.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["obsidian"] = mat

    # Dark metal (chains, brazier trim, horns)
    mat = bpy.data.materials.new("Dark_Metal")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    bsdf = n.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.03, 0.025, 0.02, 1)
    bsdf.inputs["Metallic"].default_value = 0.9
    bsdf.inputs["Roughness"].default_value = 0.3
    l.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["metal"] = mat

    # Ritual emission (red)
    mat = bpy.data.materials.new("Ritual_Glow")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    emi = n.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (0.9, 0.1, 0.02, 1)
    emi.inputs["Strength"].default_value = 6.0
    l.new(emi.outputs["Emission"], out.inputs["Surface"])
    mats["ritual"] = mat

    # Fire emission (orange)
    mat = bpy.data.materials.new("Fire_Emissive")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    emi = n.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (1.0, 0.45, 0.15, 1)
    emi.inputs["Strength"].default_value = 15.0
    l.new(emi.outputs["Emission"], out.inputs["Surface"])
    mats["fire"] = mat

    # Crystal emission (purple)
    mat = bpy.data.materials.new("Crystal_Glow")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    emi = n.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (0.6, 0.15, 0.9, 1)
    emi.inputs["Strength"].default_value = 8.0
    l.new(emi.outputs["Emission"], out.inputs["Surface"])
    mats["crystal"] = mat

    # Rune gold glow
    mat = bpy.data.materials.new("Rune_Gold")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    emi = n.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (1.0, 0.7, 0.2, 1)
    emi.inputs["Strength"].default_value = 4.0
    l.new(emi.outputs["Emission"], out.inputs["Surface"])
    mats["rune"] = mat

    # Bone
    mat = bpy.data.materials.new("Bone")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    l = mat.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    bsdf = n.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.65, 0.6, 0.55, 1)
    bsdf.inputs["Roughness"].default_value = 0.6
    l.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mats["bone"] = mat

    return mats

materials = create_materials()

# ===== HELPERS =====
def hex_vertices(radius, offset=0.0):
    return [(math.cos(offset + i * math.tau / NUM_SIDES) * radius,
             math.sin(offset + i * math.tau / NUM_SIDES) * radius)
            for i in range(NUM_SIDES)]

# ===== GEOMETRY =====
def create_hex_floor():
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=PLATFORM_RADIUS + 0.25,
        depth=PLATFORM_HEIGHT,
        location=(0, 0, -PLATFORM_HEIGHT / 2)
    )
    obj = bpy.context.object
    obj.rotation_euler.z = math.pi / 6
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.12
    bev.segments = 3
    bpy.ops.object.modifier_apply(modifier="Bevel")
    obj.data.materials.append(materials["stone"])
    return obj

def create_hex_ring(radius, thickness=0.35, height=0.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius, depth=height, location=(0, 0, height/2))
    outer = bpy.context.object
    outer.rotation_euler.z = math.pi / 6
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius - thickness, depth=height + 0.1, location=(0, 0, height/2))
    inner = bpy.context.object
    inner.rotation_euler.z = math.pi / 6
    bool_mod = outer.modifiers.new("Boolean", "BOOLEAN")
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")
    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials["ritual"])
    return outer

def create_circle_ring(r_inner, r_outer, height=0.02):
    bpy.ops.mesh.primitive_cylinder_add(radius=r_outer, depth=height, location=(0,0,height/2))
    outer = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(radius=r_inner, depth=height+0.05, location=(0,0,height/2))
    inner = bpy.context.object
    bool_mod = outer.modifiers.new("Boolean","BOOLEAN")
    bool_mod.operation='DIFFERENCE'
    bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")
    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials["ritual"])
    return outer

def create_runes(radius, count=6):
    objs = []
    for i in range(count):
        angle = i * math.tau / count + math.pi/6
        x, y = math.cos(angle)*radius, math.sin(angle)*radius
        bpy.ops.mesh.primitive_plane_add(size=0.35, location=(x,y,0.03))
        rune = bpy.context.object
        rune.rotation_euler.z = angle + math.pi/2
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.transform.vertex_random(offset=0.05)
        bpy.ops.object.mode_set(mode='OBJECT')
        rune.data.materials.append(materials["rune"])
        objs.append(rune)
    return objs

def create_pillar(loc):
    parts = []
    # main cylinder
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=0.32,
        depth=PILLAR_HEIGHT,
        location=(loc[0], loc[1], PILLAR_HEIGHT/2)
    )
    body = bpy.context.object
    # taper top slightly
    bm = bmesh.new()
    bm.from_mesh(body.data)
    for v in bm.verts:
        if v.co.z > 0:
            t = v.co.z / PILLAR_HEIGHT
            scale = 1.0 - 0.15 * t
            v.co.x *= scale
            v.co.y *= scale
    bm.to_mesh(body.data); bm.free()
    body.data.materials.append(materials["obsidian"])
    parts.append(body)

    # base
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.48, depth=0.18, location=(loc[0], loc[1], 0.09))
    base = bpy.context.object
    base.data.materials.append(materials["obsidian"])
    parts.append(base)

    # cap
    cap_z = PILLAR_HEIGHT + 0.06
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.26, depth=0.12, location=(loc[0], loc[1], cap_z))
    cap = bpy.context.object
    cap.data.materials.append(materials["obsidian"])
    parts.append(cap)

    # floating crystal
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.18, location=(loc[0], loc[1], PILLAR_HEIGHT + 0.45))
    crystal = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(crystal.data)
    for v in bm.verts: v.co.z *= 1.6
    bm.to_mesh(crystal.data); bm.free()
    crystal.data.materials.append(materials["crystal"])
    parts.append(crystal)

    # crystal light
    bpy.ops.object.light_add(type='POINT', radius=0.5, location=(loc[0], loc[1], PILLAR_HEIGHT + 0.45))
    light = bpy.context.object
    light.data.color = (0.6, 0.2, 0.9)
    light.data.energy = 25
    parts.append(light)

    # brazier bowl
    brazier_z = cap_z + 0.1
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.08, location=(loc[0], loc[1], brazier_z))
    bowl = bpy.context.object
    bowl.data.materials.append(materials["metal"])
    parts.append(bowl)

    # fire stack (three spheres)
    fire_heights = [0.02, 0.12, 0.2]
    fire_sizes = [0.12, 0.1, 0.08]
    for h, s in zip(fire_heights, fire_sizes):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=s, location=(loc[0], loc[1], brazier_z + h))
        f = bpy.context.object
        f.data.materials.append(materials["fire"])
        parts.append(f)

    # fire light
    bpy.ops.object.light_add(type='POINT', radius=0.4, location=(loc[0], loc[1], brazier_z + 0.15))
    flight = bpy.context.object
    flight.data.color = (1.0, 0.5, 0.2)
    flight.data.energy = 80
    parts.append(flight)

    return parts

def create_edge_spikes():
    decos = []
    verts = hex_vertices(PLATFORM_RADIUS + 0.05, offset=math.pi/6)
    for i in range(NUM_SIDES):
        v1 = verts[i]; v2 = verts[(i+1)%NUM_SIDES]
        edge_vec = (v2[0]-v1[0], v2[1]-v1[1])
        edge_angle = math.atan2(edge_vec[1], edge_vec[0])
        for j in range(4):
            t = (j+0.5)/4
            x = v1[0] + edge_vec[0]*t
            y = v1[1] + edge_vec[1]*t
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.12, radius2=0, depth=0.35, location=(x,y,0.18))
            spike = bpy.context.object
            spike.rotation_euler.z = edge_angle
            spike.data.materials.append(materials["obsidian"])
            decos.append(spike)
    return decos

def create_cracks():
    cracks = []
    for i in range(6):
        angle = i * math.tau / 6 + math.pi/6
        length = 2.6
        curve = bpy.data.curves.new(f"Crack_{i}", 'CURVE')
        curve.dimensions = '3D'
        spline = curve.splines.new('BEZIER')
        spline.bezier_points.add(2)
        start_r = 1.3
        end_r = start_r + length
        pts = spline.bezier_points
        pts[0].co = (math.cos(angle)*start_r, math.sin(angle)*start_r, 0.01)
        pts[1].co = (math.cos(angle+0.08)*(start_r+length/2), math.sin(angle+0.08)*(start_r+length/2), 0.01)
        pts[2].co = (math.cos(angle-0.05)*end_r, math.sin(angle-0.05)*end_r, 0.01)
        curve.bevel_depth = 0.012
        curve.bevel_resolution = 2
        obj = bpy.data.objects.new(f"Crack_{i}", curve)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(materials["ritual"])
        cracks.append(obj)
    return cracks

def create_chains_between_pillars(pillar_positions):
    chains = []
    for i in range(NUM_SIDES):
        a = pillar_positions[i]
        b = pillar_positions[(i+1)%NUM_SIDES]
        mid = ((a[0]+b[0])/2, (a[1]+b[1])/2, PILLAR_HEIGHT*0.55)
        z_top = PILLAR_HEIGHT*0.9
        points = [
            (a[0], a[1], z_top),
            (mid[0], mid[1], z_top - 0.25),
            (b[0], b[1], z_top)
        ]
        curve = bpy.data.curves.new(f"Chain_{i}", 'CURVE')
        curve.dimensions='3D'
        spline = curve.splines.new('BEZIER')
        spline.bezier_points.add(2)
        for bp, co in zip(spline.bezier_points, points):
            bp.co = co
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
        curve.bevel_depth = 0.025
        curve.bevel_resolution = 3
        obj = bpy.data.objects.new(f"Chain_{i}", curve)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(materials["metal"])
        chains.append(obj)
    return chains

def create_rune_beams(pillar_positions):
    beams = []
    for i, (x,y) in enumerate(pillar_positions):
        curve = bpy.data.curves.new(f"RuneBeam_{i}", 'CURVE')
        curve.dimensions='3D'
        spline = curve.splines.new('BEZIER')
        spline.bezier_points.add(1)
        spline.bezier_points[0].co = (x,y,0.05)
        spline.bezier_points[1].co = (0,0,0.15)
        for bp in spline.bezier_points:
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
        curve.bevel_depth = 0.02
        curve.bevel_resolution = 2
        obj = bpy.data.objects.new(f"RuneBeam_{i}", curve)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(materials["rune"])
        beams.append(obj)
    return beams

def create_skulls(count=10, radius=4.5):
    skulls = []
    for i in range(count):
        ang = random.random() * math.tau
        r = radius * math.sqrt(random.random())
        x = math.cos(ang) * r
        y = math.sin(ang) * r
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.12, location=(x,y,0.06))
        sk = bpy.context.object
        sk.scale[2] *= 0.8
        sk.data.materials.append(materials["bone"])
        skulls.append(sk)
    return skulls

def create_demon_horns():
    horns = []
    radius = 1.1
    z = 0.6
    for i in range(6):
        ang = i * math.tau / 6 + math.pi/6
        x = math.cos(ang)*radius
        y = math.sin(ang)*radius
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.1, radius2=0.0, depth=0.45, location=(x,y,z))
        horn = bpy.context.object
        horn.rotation_euler.x = -0.5
        horn.rotation_euler.z = ang + math.pi
        horn.data.materials.append(materials["metal"])
        horns.append(horn)
    return horns

def create_central_altar():
    parts = []
    # base
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.3, depth=0.25, location=(0,0,0.125))
    base = bpy.context.object
    base.rotation_euler.z = math.pi/6
    base.data.materials.append(materials["obsidian"])
    parts.append(base)
    # mid
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.9, depth=0.2, location=(0,0,0.35))
    mid = bpy.context.object
    mid.rotation_euler.z = math.pi/6
    mid.data.materials.append(materials["obsidian"])
    parts.append(mid)
    # top
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.55, depth=0.14, location=(0,0,0.54))
    top = bpy.context.object
    top.rotation_euler.z = math.pi/6
    top.data.materials.append(materials["stone"])
    parts.append(top)
    # fire pillar at center
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=1.2, location=(0,0,1.14))
    fire_column = bpy.context.object
    fire_column.data.materials.append(materials["fire"])
    parts.append(fire_column)
    # orb on top
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0,0,1.8))
    orb = bpy.context.object
    orb.data.materials.append(materials["ritual"])
    parts.append(orb)
    # light
    bpy.ops.object.light_add(type='POINT', radius=1.0, location=(0,0,1.5))
    light = bpy.context.object
    light.data.color = (1.0,0.3,0.1)
    light.data.energy = 120
    parts.append(light)
    return parts

# ===== BUILD =====
print("Creating Boss Platform V3 (Hexagonal Diablo)...")

floor = create_hex_floor()

# triple ritual rings (outer/middle hex, inner circle)
outer_ring = create_hex_ring(OUTER_RING_RADIUS, thickness=0.4)
outer_ring.name = "Ritual_Ring_Outer"
middle_ring = create_hex_ring(MIDDLE_RING_RADIUS, thickness=0.3)
middle_ring.name = "Ritual_Ring_Middle"
inner_ring = create_circle_ring(INNER_RING_RADIUS-0.2, INNER_RING_RADIUS)
inner_ring.name = "Ritual_Ring_Inner"

# runes
runes_outer = create_runes(OUTER_RING_RADIUS-0.6, 6)
runes_inner = create_runes(MIDDLE_RING_RADIUS-0.4, 6)

# pillars on vertices
pillar_positions = []
for i in range(NUM_SIDES):
    angle = math.pi/6 + i * math.pi/3 - math.pi/6  # 명시된 식, 결과적으로 i*π/3
    x = math.cos(angle) * PILLAR_RADIUS_POS
    y = math.sin(angle) * PILLAR_RADIUS_POS
    pillar_positions.append((x, y))
pillars = []
for pos in pillar_positions:
    pillars.extend(create_pillar(pos))

# altar
altar = create_central_altar()

# cracks
cracks = create_cracks()

# edge spikes
spikes = create_edge_spikes()

# chains
chains = create_chains_between_pillars(pillar_positions)

# rune beams
beams = create_rune_beams(pillar_positions)

# skull scatter
skulls = create_skulls(count=12, radius=4.8)

# demon horns
horns = create_demon_horns()

# smooth shading
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# parent empty
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
root = bpy.context.object
root.name = "Boss_Platform_V3"
for obj in bpy.context.scene.objects:
    if obj != root and obj.parent is None:
        obj.parent = root

print("Done. Export as GLB via File > Export > glTF 2.0")
