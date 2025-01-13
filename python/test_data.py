import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import gemmi

def main():

    x, y, z = np.mgrid[0:31:32j, 0:31:32j, 0:31:32j]
    data1_path = "/Users/dialpuri/Downloads/_input.txt"
    with open(data1_path, "r") as f:
        data1 = f.read().splitlines()

    data1 = np.array(data1).astype(np.float32)
    data1 = data1.reshape(32,32,32)

    data2_path = "/Users/dialpuri/Downloads/_output.txt"
    with open(data2_path, "r") as f:
        data2 = f.read().splitlines()

    data2 = np.array(data2).astype(np.float32)
    data2 = data2.reshape(32,32,32,4)
    data2 = data2[:,:,:,1]

    c = gemmi.UnitCell(22.4,22.4,22.4,90,90,90)
    m1 = gemmi.Ccp4Map()
    m1.grid = gemmi.FloatGrid(data1, c)
    m1.update_ccp4_header()
    m1.write_ccp4_map("/Users/dialpuri/Downloads/test_data_1.map")

    m2 = gemmi.Ccp4Map()
    m2.grid = gemmi.FloatGrid(data2, c)
    m2.update_ccp4_header()
    m2.write_ccp4_map("/Users/dialpuri/Downloads/test_data_2.map")



    # Create subplots with two 3D plots side by side
    fig = make_subplots(
        rows=1, cols=2,
        specs=[[{'type': 'volume'}, {'type': 'volume'}]],
        subplot_titles=("Volume 1", "Volume 2")
    )

    # Add the first volume plot
    fig.add_trace(
        go.Volume(
            x=x.flatten(),
            y=y.flatten(),
            z=z.flatten(),
            value=data1.flatten(),
            isomin=-1,
            isomax=1,
            opacity=0.1,  # Adjust opacity
            surface_count=20  # Number of isosurfaces
        ),
        row=1, col=1
    )

    # Add the second volume plot
    fig.add_trace(
        go.Volume(
            x=x.flatten(),
            y=y.flatten(),
            z=z.flatten(),
            value=data2.flatten(),
            isomin=-1,
            isomax=1,
            opacity=0.1,  # Adjust opacity
            surface_count=20  # Number of isosurfaces
        ),
        row=1, col=2
    )

    # Update layout for better visualization
    fig.update_layout(
        title="Side-by-Side Volume Plots",
        width=1200,
        height=600,
        scene=dict(aspectmode='cube'),
        scene2=dict(aspectmode='cube')  # For the second plot
    )

    # Show the plot
    fig.show()

if __name__ == "__main__":
    main()