
def f():
    # Scenario: There is an assignment down the road.
    if False:
        file_data = b'something'
    
    print("'file_data' in locals():", 'file_data' in locals())
    try:
        # If 'file_data' is in locals(), then evaluating 'file_data' 
        # (on the right side of 'if') will raise UnboundLocalError!
        val = file_data if 'file_data' in locals() else 'default'
        print("Val Outcome:", val)
    except UnboundLocalError as e:
        print("UnboundLocalError:", e)

f()
