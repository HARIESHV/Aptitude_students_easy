
def test_locals():
    # If sub_uuid is not defined, will this fail?
    try:
        sub_uuid = sub_uuid if 'sub_uuid' in locals() else 'generated-uuid'
        print(f"Outcome: {sub_uuid}")
    except UnboundLocalError as e:
        print(f"Failed with UnboundLocalError: {e}")
    except Exception as e:
        print(f"Failed with unexpected error: {type(e).__name__}: {e}")

test_locals()
