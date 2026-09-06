import json
from datetime import datetime, timedelta

def parse_time(time_str):
    if not time_str:
        return None
    return datetime.strptime(time_str, "%H:%M")

def get_commute_time(from_coords, to_coords, mode, matrix_json):
    if not matrix_json: return 20
    try:
        matrix = json.loads(matrix_json)
        return int(matrix.get(mode, {}).get(from_coords, {}).get(to_coords, 1200) / 60)
    except:
        return 20

def generate_commutes(data, settings, events_today):
    mapping = {}
    for prefix in ['home', 'work', 'gym', 'field']:
        addr = settings.get(f"{prefix}_address")
        coords = settings.get(f"{prefix}_coords")
        if addr and coords:
            mapping[addr] = coords
    try:
        custom = json.loads(settings.get('custom_locations', '[]'))
        for c in custom:
            if c.get('lat') and c.get('lon'):
                mapping[c.get('address') or c.get('name')] = f"{c['lat']},{c['lon']}"
    except:
        pass

    home_addr = settings.get('home_address', 'Home')
    this_addr = data.location_type or home_addr
    this_coords = mapping.get(this_addr, mapping.get(home_addr))

    if not data.start_time or not data.duration_mins or not this_coords:
        return []

    new_start = parse_time(data.start_time)
    new_end = new_start + timedelta(minutes=data.duration_mins)

    preceding = None
    succeeding = None

    for ev in events_today:
        if not ev.get('start_time') or not ev.get('duration_mins'):
            continue
        ev_start = parse_time(ev['start_time'])
        ev_end = ev_start + timedelta(minutes=ev['duration_mins'])

        if ev_end <= new_start:
            if not preceding or ev_end > (parse_time(preceding['start_time']) + timedelta(minutes=preceding['duration_mins'])):
                preceding = ev
        if ev_start >= new_end:
            if not succeeding or ev_start < parse_time(succeeding['start_time']):
                succeeding = ev

    # Check gap before
    from_addr = home_addr
    if preceding:
        p_end = parse_time(preceding['start_time']) + timedelta(minutes=preceding['duration_mins'])
        if (new_start - p_end).total_seconds() <= 1800:
            from_addr = preceding.get('location_type') or home_addr

    # Check gap after
    to_addr = home_addr
    if succeeding:
        s_start = parse_time(succeeding['start_time'])
        if (s_start - new_end).total_seconds() <= 1800:
            to_addr = succeeding.get('location_type') or home_addr

    from_coords = mapping.get(from_addr, mapping.get(home_addr))
    to_coords = mapping.get(to_addr, mapping.get(home_addr))

    commute_to_mins = get_commute_time(from_coords, this_coords, data.commute_mode, settings.get('distance_matrix'))
    commute_from_mins = get_commute_time(this_coords, to_coords, data.commute_mode, settings.get('distance_matrix'))

    commutes = []
    if commute_to_mins > 0 and from_coords != this_coords:
        commutes.append({
            "title": f"Commute to {this_addr.split(',')[0]}",
            "start_time": (new_start - timedelta(minutes=commute_to_mins)).strftime("%H:%M"),
            "duration_mins": commute_to_mins
        })
    if commute_from_mins > 0 and this_coords != to_coords:
        commutes.append({
            "title": f"Commute from {this_addr.split(',')[0]}",
            "start_time": new_end.strftime("%H:%M"),
            "duration_mins": commute_from_mins
        })
    return commutes
