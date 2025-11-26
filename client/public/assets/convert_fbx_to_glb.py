import bpy
import os
import sys

# Get input/output paths from command line args
input_file = sys.argv[-2]
output_file = sys.argv[-1]

# Clear the scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import FBX
bpy.ops.import_scene.fbx(filepath=input_file)

# Export as GLB
bpy.ops.export_scene.gltf(
    filepath=output_file,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_morph=True
)

print(f"Converted {input_file} to {output_file}")
