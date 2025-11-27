"""
Boss Platform V4 - Hexagonal Diablo Style, GLB-safe (no complex nodes)

Key points:
- Only Principled BSDF with direct inputs (Base Color / Metallic / Roughness / Emission).
- No Noise/ColorRamp/Bump nodes to avoid white fallback on glTF export.
- Six pillars on hex vertices, chains, rune lines, lava cracks, braziers, skulls, horns,
  triple ritual rings, central fire pillar + soul orb.

Export: File > Export > glTF 2.0 (.glb) / glTF Binary, Apply Modifiers ON, Materials ON.
Save to: client/public/assets/terrain/boss_platform.glb
"""

import bpy
import bmesh
import math
import random

random.seed(42)

# ---- cleanup ----
def cleanup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

cleanup()

# ---- constants ----
NUM_SIDES = 6
PLATFORM_SIZE = 14.0
PLATFORM_RADIUS = PLATFORM_SIZE / 2
PLATFORM_HEIGHT = 0.6
PILLAR_RADIUS_POS = PLATFORM_RADIUS - 0.5
PILLAR_HEIGHT = 2.5
OUTER_RING_RADIUS = 6.0
MIDDLE_RING_RADIUS = 3.5
INNER_RING_RADIUS = 1.4

# ---- materials (Principled only) ----
def make_principled(name, base_color, rough=0.5, metal=0.0, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission_color is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission_color, 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat

materials = {
    "stone":   make_principled("Dark_Stone", (0.05, 0.045, 0.04), rough=0.9, metal=0.0),
    "obsidian":make_principled("Obsidian",   (0.02, 0.02, 0.025), rough=0.25, metal=0.05),
    "metal":   make_principled("Dark_Metal", (0.03, 0.025, 0.02), rough=0.3, metal=0.9),
    "ritual":  make_principled("Ritual_Glow",(0.9, 0.1, 0.02), rough=0.2, metal=0.0,
                               emission_color=(0.9, 0.1, 0.02), emission_strength=6.0),
    "fire":    make_principled("Fire_Emissive",(1.0, 0.45, 0.15), rough=0.4, metal=0.0,
                               emission_color=(1.0, 0.45, 0.15), emission_strength=12.0),
    "crystal": make_principled("Crystal_Glow",(0.6, 0.15, 0.9), rough=0.2, metal=0.0,
                               emission_color=(0.6, 0.15, 0.9), emission_strength=8.0),
    "bone":    make_principled("Bone",(0.65, 0.6, 0.55), rough=0.6, metal=0.0),
    "lava":    make_principled("Lava",(1.0, 0.35, 0.1), rough=0.35, metal=0.0,
                               emission_color=(1.0, 0.35, 0.1), emission_strength=10.0),
}

# ---- helpers ----
def hex_vertices(radius, offset=0.0):
    return [(math.cos(offset + i * math.tau / NUM_SIDES) * radius,
             math.sin(offset + i * math.tau / NUM_SIDES) * radius)
            for i in range(NUM_SIDES)]

# ---- geometry builders ----
def hex_floor():
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=PLATFORM_RADIUS+0.25,
                                        depth=PLATFORM_HEIGHT, location=(0,0,-PLATFORM_HEIGHT/2))
    obj = bpy.context.object
    obj.rotation_euler.z = math.pi/6
    bev = obj.modifiers.new("Bevel","BEVEL")
    bev.width = 0.12; bev.segments = 3
    bpy.ops.object.modifier_apply(modifier="Bevel")
    obj.data.materials.append(materials["stone"])
    return obj

def hex_ring(radius, thickness=0.35, height=0.025, mat="ritual"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius, depth=height, location=(0,0,height/2))
    outer = bpy.context.object
    outer.rotation_euler.z = math.pi/6
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius-thickness, depth=height+0.08, location=(0,0,height/2))
    inner = bpy.context.object
    inner.rotation_euler.z = math.pi/6
    bool_mod = outer.modifiers.new("Boolean","BOOLEAN")
    bool_mod.operation='DIFFERENCE'; bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")
    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials[mat])
    return outer

def circle_ring(r_inner, r_outer, height=0.02, mat="ritual"):
    bpy.ops.mesh.primitive_cylinder_add(radius=r_outer, depth=height, location=(0,0,height/2))
    outer = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(radius=r_inner, depth=height+0.05, location=(0,0,height/2))
    inner = bpy.context.object
    bool_mod = outer.modifiers.new("Boolean","BOOLEAN")
    bool_mod.operation='DIFFERENCE'; bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="Boolean")
    bpy.data.objects.remove(inner, do_unlink=True)
    outer.data.materials.append(materials[mat])
    return outer

def runes(radius, count=6):
    objs = []
    for i in range(count):
        ang = i * math.tau / count + math.pi/6
        x = math.cos(ang)*radius; y = math.sin(ang)*radius
        bpy.ops.mesh.primitive_plane_add(size=0.32, location=(x,y,0.03))
        r = bpy.context.object
        r.rotation_euler.z = ang + math.pi/2
        r.data.materials.append(materials["ritual"])
        objs.append(r)
    return objs

def pillar(pos):
    parts = []
    x,y = pos
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.32, depth=PILLAR_HEIGHT, location=(x,y,PILLAR_HEIGHT/2))
    body = bpy.context.object
    # taper top
    bm = bmesh.new(); bm.from_mesh(body.data)
    for v in bm.verts:
        if v.co.z > 0:
            t = v.co.z / PILLAR_HEIGHT
            s = 1 - 0.15 * t
            v.co.x *= s; v.co.y *= s
    bm.to_mesh(body.data); bm.free()
    body.data.materials.append(materials["obsidian"])
    parts.append(body)

    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.48, depth=0.18, location=(x,y,0.09))
    base = bpy.context.object; base.data.materials.append(materials["obsidian"]); parts.append(base)

    cap_z = PILLAR_HEIGHT + 0.06
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.26, depth=0.12, location=(x,y,cap_z))
    cap = bpy.context.object; cap.data.materials.append(materials["obsidian"]); parts.append(cap)

    # floating crystal
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.18, location=(x,y,PILLAR_HEIGHT+0.45))
    cry = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(cry.data)
    for v in bm.verts: v.co.z *= 1.6
    bm.to_mesh(cry.data); bm.free()
    cry.data.materials.append(materials["crystal"]); parts.append(cry)

    # brazier bowl
    brazier_z = cap_z + 0.1
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.08, location=(x,y,brazier_z))
    bowl = bpy.context.object; bowl.data.materials.append(materials["metal"]); parts.append(bowl)

    # fire spheres
    for h,s in [(0.02,0.12),(0.12,0.1),(0.22,0.08)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=s, location=(x,y,brazier_z+h))
        f = bpy.context.object; f.data.materials.append(materials["fire"]); parts.append(f)

    # crystal + fire lights
    bpy.ops.object.light_add(type='POINT', radius=0.5, location=(x,y,PILLAR_HEIGHT+0.45))
    l1 = bpy.context.object; l1.data.color=(0.6,0.2,0.9); l1.data.energy=25; parts.append(l1)
    bpy.ops.object.light_add(type='POINT', radius=0.4, location=(x,y,brazier_z+0.15))
    l2 = bpy.context.object; l2.data.color=(1.0,0.5,0.2); l2.data.energy=80; parts.append(l2)

    return parts

def edge_spikes():
    decos = []
    verts = hex_vertices(PLATFORM_RADIUS+0.05, offset=math.pi/6)
    for i in range(NUM_SIDES):
        v1 = verts[i]; v2 = verts[(i+1)%NUM_SIDES]
        vec = (v2[0]-v1[0], v2[1]-v1[1])
        ang = math.atan2(vec[1], vec[0])
        for j in range(4):
            t = (j+0.5)/4
            x = v1[0] + vec[0]*t
            y = v1[1] + vec[1]*t
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.12, radius2=0, depth=0.35, location=(x,y,0.18))
            sp = bpy.context.object
            sp.rotation_euler.z = ang
            sp.data.materials.append(materials["obsidian"])
            decos.append(sp)
    return decos

def cracks_lava():
    objs = []
    for i in range(8):
        ang = i * math.tau / 8 + math.pi/6
        length = 3.0
        r0 = 1.0
        steps = 4
        for s in range(steps):
            t0 = s/steps; t1 = (s+1)/steps
            r_start = r0 + length*t0
            r_end = r0 + length*t1
            x1 = math.cos(ang+0.05*s)*r_start
            y1 = math.sin(ang+0.05*s)*r_start
            x2 = math.cos(ang+0.05*(s+1))*r_end
            y2 = math.sin(ang+0.05*(s+1))*r_end
            midx = (x1+x2)/2; midy=(y1+y2)/2
            seg_len = math.dist((x1,y1),(x2,y2))
            bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=seg_len,
                                                location=(midx, midy, 0.03),
                                                rotation=(math.pi/2,0,math.atan2(y2-y1,x2-x1)))
            seg = bpy.context.object
            seg.data.materials.append(materials["lava"])
            objs.append(seg)
    return objs

def chains_between(pillar_positions):
    chain_objs = []
    for i in range(NUM_SIDES):
        a = pillar_positions[i]; b = pillar_positions[(i+1)%NUM_SIDES]
        mid = ((a[0]+b[0])/2, (a[1]+b[1])/2)
        z_top = PILLAR_HEIGHT*0.9
        ctrl = (mid[0], mid[1], z_top-0.3)
        points = [(a[0],a[1],z_top),(ctrl[0],ctrl[1],ctrl[2]),(b[0],b[1],z_top)]
        # make poly chain as linked little cylinders
        links = 12
        for j in range(links):
            t = j / links
            t2 = (j+1)/links
            def bez(t):
                u=1-t; return (
                    u*u*points[0][0]+2*u*t*points[1][0]+t*t*points[2][0],
                    u*u*points[0][1]+2*u*t*points[1][1]+t*t*points[2][1],
                    u*u*points[0][2]+2*u*t*points[1][2]+t*t*points[2][2],
                )
            p1 = bez(t); p2 = bez(t2)
            midp = ((p1[0]+p2[0])/2,(p1[1]+p2[1])/2,(p1[2]+p2[2])/2)
            seg_len = math.dist(p1,p2)
            bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=seg_len,
                                                location=midp,
                                                rotation=(math.pi/2,0,math.atan2(p2[1]-p1[1], p2[0]-p1[0])))
            seg = bpy.context.object
            seg.data.materials.append(materials["metal"])
            chain_objs.append(seg)
    return chain_objs

def rune_beams(pillar_positions):
    objs = []
    for i,(x,y) in enumerate(pillar_positions):
        midz = 0.12
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=math.sqrt(x*x+y*y)+0.1,
                                            location=(x/2, y/2, midz),
                                            rotation=(math.pi/2, 0, math.atan2(y,x)))
        beam = bpy.context.object
        beam.data.materials.append(materials["ritual"])
        objs.append(beam)
    return objs

def skulls(count=12, radius=4.8):
    objs=[]
    for _ in range(count):
        ang = random.random()*math.tau
        r = radius * math.sqrt(random.random())
        x = math.cos(ang)*r; y=math.sin(ang)*r
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.12, location=(x,y,0.06))
        sk = bpy.context.object
        sk.scale[2]*=0.8
        sk.data.materials.append(materials["bone"])
        objs.append(sk)
    return objs

def horns():
    objs=[]
    radius=1.1; z=0.6
    for i in range(6):
        ang=i*math.tau/6+math.pi/6
        x=math.cos(ang)*radius; y=math.sin(ang)*radius
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.1, radius2=0, depth=0.45, location=(x,y,z))
        h=bpy.context.object
        h.rotation_euler.x=-0.5
        h.rotation_euler.z=ang+math.pi
        h.data.materials.append(materials["metal"])
        objs.append(h)
    return objs

def altar():
    parts=[]
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.3, depth=0.25, location=(0,0,0.125))
    base=bpy.context.object; base.rotation_euler.z=math.pi/6; base.data.materials.append(materials["obsidian"]); parts.append(base)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.9, depth=0.2, location=(0,0,0.35))
    mid=bpy.context.object; mid.rotation_euler.z=math.pi/6; mid.data.materials.append(materials["obsidian"]); parts.append(mid)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.55, depth=0.14, location=(0,0,0.54))
    top=bpy.context.object; top.rotation_euler.z=math.pi/6; top.data.materials.append(materials["stone"]); parts.append(top)
    # fire pillar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=1.2, location=(0,0,1.14))
    fp=bpy.context.object; fp.data.materials.append(materials["fire"]); parts.append(fp)
    # soul orb
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0,0,1.8))
    orb=bpy.context.object; orb.data.materials.append(materials["ritual"]); parts.append(orb)
    # light
    bpy.ops.object.light_add(type='POINT', radius=1.0, location=(0,0,1.5))
    l=bpy.context.object; l.data.color=(1.0,0.3,0.1); l.data.energy=120; parts.append(l)
    return parts

# ---- build scene ----
print("Creating Boss Platform V4 (GLB-safe)...")

floor = hex_floor()

outer_ring = hex_ring(OUTER_RING_RADIUS, thickness=0.4)
middle_ring = hex_ring(MIDDLE_RING_RADIUS, thickness=0.3)
inner_ring = circle_ring(INNER_RING_RADIUS-0.2, INNER_RING_RADIUS)

runes_outer = runes(OUTER_RING_RADIUS-0.6, 6)
runes_inner = runes(MIDDLE_RING_RADIUS-0.4, 6)

pillar_positions = []
for i in range(NUM_SIDES):
    ang = math.pi/6 + i*math.pi/3 - math.pi/6
    x = math.cos(ang)*PILLAR_RADIUS_POS
    y = math.sin(ang)*PILLAR_RADIUS_POS
    pillar_positions.append((x,y))
pillars=[]
for pos in pillar_positions:
    pillars.extend(pillar(pos))

alt = altar()
spikes = edge_spikes()
lava = cracks_lava()
chains = chains_between(pillar_positions)
beams = rune_beams(pillar_positions)
sk = skulls()
hrn = horns()

# smooth shading meshes
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# parent everything
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
root = bpy.context.object; root.name = "Boss_Platform_V4"
for obj in bpy.context.scene.objects:
    if obj != root and obj.parent is None:
        obj.parent = root

print("Build complete. Export via File > Export > glTF 2.0 (.glb)")
