
def test_locals_assignment():
    try:
        # file_data is on the left side, so it should be in locals() as a name.
        # But it wouldn't be assigned yet.
        print("Before logic:", 'file_data' in locals())
        fd = file_data if 'file_data' in locals() else 'default'
        print("FD Outcome:", fd)
        
        # Now let's test the EXACT line in app.py
        # file_data = file_data if 'file_data' in locals() else None
        # This should fail if it thinks file_data already exists in locals() 
        # but is not initialized.
        z = z if 'z' in locals() else 'val'
        print("Z Outcome:", z)
        
    except UnboundLocalError as e:
        print(f"Failed with UnboundLocalError: {e}")
    except Exception as e:
        print(f"Failed with unexpected error: {type(e).__name__}: {e}")

test_locals_assignment()
