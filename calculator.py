import json

CO2_PER_KWH = 0.82 # kg CO2e per kWh (typical coal-heavy national grid factor)
TREE_CO2_PER_YEAR = 21.0 # kg CO2 absorbed by one tree per year

def calculate_appliance_energy(power_watts, hours_per_day, days_per_month=30, quantity=1, standby_watts=0, standby_hours=0):
    """
    Calculate active, standby and total kWh for an appliance.
    Formula: (Watts * Hours * Days * Qty) / 1000
    Note: For refrigerators with continuous run, effective duty cycle is ~35-40% of rated compressor power.
    """
    power_watts = float(power_watts)
    hours_per_day = float(hours_per_day)
    days_per_month = int(days_per_month)
    quantity = int(quantity)
    standby_watts = float(standby_watts or 0)
    standby_hours = float(standby_hours or 0)

    # Active consumption
    active_kwh = (power_watts * hours_per_day * days_per_month * quantity) / 1000.0

    # Standby / Phantom consumption
    standby_kwh = (standby_watts * standby_hours * days_per_month * quantity) / 1000.0

    total_kwh = active_kwh + standby_kwh
    return {
        'active_kwh': round(active_kwh, 2),
        'standby_kwh': round(standby_kwh, 2),
        'total_kwh': round(total_kwh, 2),
        'daily_kwh': round(total_kwh / days_per_month, 3) if days_per_month > 0 else 0
    }

def calculate_bill(units, tariff):
    """
    Calculate electricity bill considering flat or tiered slab structure,
    fixed charges, and regulatory taxes/electricity duty.
    """
    units = float(units or 0)
    rate_type = tariff.get('rate_type', 'flat')
    flat_rate = float(tariff.get('flat_rate', 7.0))
    fixed_charge = float(tariff.get('fixed_charge', 50.0))
    tax_percent = float(tariff.get('tax_percent', 5.0))
    
    energy_charge = 0.0
    slab_breakdown = []

    if rate_type == 'slab' and tariff.get('slab_json'):
        try:
            slabs = json.loads(tariff['slab_json']) if isinstance(tariff['slab_json'], str) else tariff['slab_json']
            remaining = units
            
            for slab in slabs:
                s_from = float(slab.get('from', 0))
                s_to = float(slab.get('to', 999999))
                rate = float(slab.get('rate', flat_rate))
                
                slab_capacity = s_to - s_from + (1 if s_from > 0 else 0)
                if remaining <= 0:
                    break
                    
                units_in_slab = min(remaining, slab_capacity)
                cost_in_slab = units_in_slab * rate
                energy_charge += cost_in_slab
                
                slab_breakdown.append({
                    'range': f"{int(s_from)} - {int(s_to) if s_to < 900000 else 'above'}",
                    'rate': rate,
                    'units': round(units_in_slab, 2),
                    'cost': round(cost_in_slab, 2)
                })
                
                remaining -= units_in_slab
        except Exception:
            # Fallback to flat rate if parsing fails
            energy_charge = units * flat_rate
            slab_breakdown.append({
                'range': 'Flat Rate',
                'rate': flat_rate,
                'units': units,
                'cost': round(energy_charge, 2)
            })
    else:
        energy_charge = units * flat_rate
        slab_breakdown.append({
            'range': 'Flat Rate',
            'rate': flat_rate,
            'units': units,
            'cost': round(energy_charge, 2)
        })

    subtotal = energy_charge + fixed_charge
    tax_amount = subtotal * (tax_percent / 100.0)
    total_amount = subtotal + tax_amount
    effective_rate = (total_amount / units) if units > 0 else flat_rate

    return {
        'units': round(units, 2),
        'energy_charge': round(energy_charge, 2),
        'fixed_charge': round(fixed_charge, 2),
        'tax_percent': tax_percent,
        'tax_amount': round(tax_amount, 2),
        'total_amount': round(total_amount, 2),
        'effective_rate': round(effective_rate, 2),
        'slab_breakdown': slab_breakdown
    }

def analyze_appliances(appliances, tariff):
    """
    Perform deep analysis of all appliances:
    - Sort & rank highest to lowest
    - Calculate percentage shares
    - Identify energy hogs and phantom drain
    - Produce actionable tips with quantifiable savings
    """
    total_kwh = 0.0
    processed = []

    # Get effective unit cost baseline
    test_bill = calculate_bill(100, tariff)
    effective_unit_rate = test_bill['effective_rate'] or float(tariff.get('flat_rate', 7.0))

    for app in appliances:
        p_watts = float(app['power_watts'])
        hours = float(app['hours_per_day'])
        days = int(app['days_per_month'])
        qty = int(app['quantity'])
        s_watts = float(app.get('standby_watts', 0) or 0)
        s_hours = float(app.get('standby_hours', 0) or 0)

        # Duty cycle adjustment for refrigerator compressor (~40% continuous)
        effective_active_watts = p_watts * 0.40 if 'refrigerator' in app['name'].lower() or 'fridge' in app['name'].lower() else p_watts

        energy = calculate_appliance_energy(effective_active_watts, hours, days, qty, s_watts, s_hours)
        app_kwh = energy['total_kwh']
        total_kwh += app_kwh

        estimated_cost = app_kwh * effective_unit_rate

        processed.append({
            'id': app['id'],
            'name': app['name'],
            'category': app['category'],
            'power_watts': p_watts,
            'quantity': qty,
            'hours_per_day': hours,
            'days_per_month': days,
            'standby_watts': s_watts,
            'standby_hours': s_hours,
            'active_kwh': energy['active_kwh'],
            'standby_kwh': energy['standby_kwh'],
            'total_kwh': app_kwh,
            'daily_kwh': energy['daily_kwh'],
            'estimated_cost': round(estimated_cost, 2),
            'co2_kg': round(app_kwh * CO2_PER_KWH, 2)
        })

    # Sort descending by total kWh
    processed.sort(key=lambda x: x['total_kwh'], reverse=True)

    # Assign rank and percentage
    for rank, item in enumerate(processed, start=1):
        item['rank'] = rank
        item['percentage'] = round((item['total_kwh'] / total_kwh * 100), 1) if total_kwh > 0 else 0

    # Calculate overall bill for total kWh
    full_bill = calculate_bill(total_kwh, tariff)

    # Category breakdown
    category_map = {}
    for item in processed:
        cat = item['category'] or 'General'
        if cat not in category_map:
            category_map[cat] = {'kwh': 0.0, 'cost': 0.0, 'count': 0}
        category_map[cat]['kwh'] += item['total_kwh']
        category_map[cat]['cost'] += item['estimated_cost']
        category_map[cat]['count'] += item['quantity']

    category_summary = []
    for cat, data in category_map.items():
        category_summary.append({
            'category': cat,
            'kwh': round(data['kwh'], 2),
            'cost': round(data['cost'], 2),
            'count': data['count'],
            'percentage': round((data['kwh'] / total_kwh * 100), 1) if total_kwh > 0 else 0
        })
    category_summary.sort(key=lambda x: x['kwh'], reverse=True)

    # Generate Waste Alerts & Smart Recommendations
    waste_alerts, tips = generate_smart_recommendations(processed, effective_unit_rate, total_kwh)

    # Environmental metrics
    co2_total = round(total_kwh * CO2_PER_KWH, 2)
    trees_needed = round(co2_total * 12 / TREE_CO2_PER_YEAR, 1)

    return {
        'appliances': processed,
        'total_kwh': round(total_kwh, 2),
        'daily_kwh': round(total_kwh / 30, 2),
        'bill': full_bill,
        'co2_total_kg': co2_total,
        'trees_needed_annual': trees_needed,
        'top_consumer': processed[0] if processed else None,
        'category_summary': category_summary,
        'waste_alerts': waste_alerts,
        'tips': tips
    }

def generate_smart_recommendations(appliances, rate, total_kwh):
    alerts = []
    tips = []

    for app in appliances:
        name_lower = app['name'].lower()
        pct = app['percentage']

        # Heavy share alert (> 25% of total bill)
        if pct >= 25:
            alerts.append({
                'type': 'warning',
                'title': f"Heavy Consumption: {app['name']}",
                'message': f"Consumes {app['total_kwh']} kWh ({pct}% of your total bill). Worth ₹{app['estimated_cost']}/month.",
                'appliance_id': app['id']
            })

        # Standby vampire power alert
        if app['standby_kwh'] > 3.0:
            standby_cost = round(app['standby_kwh'] * rate, 2)
            alerts.append({
                'type': 'info',
                'title': f"Phantom Power Drain: {app['name']}",
                'message': f"Drawing {app['standby_kwh']} kWh in standby mode, wasting ₹{standby_cost}/month without active use.",
                'appliance_id': app['id']
            })

        # AC specific recommendation
        if 'ac' in name_lower or 'air conditioner' in name_lower:
            if app['hours_per_day'] > 5:
                # 1 hour reduction
                saved_kwh = (app['power_watts'] * 1.0 * app['days_per_month'] * app['quantity']) / 1000.0
                saved_cost = round(saved_kwh * rate, 2)
                tips.append({
                    'category': 'Cooling',
                    'title': 'Optimize Air Conditioner Temperature to 24°C',
                    'action': f"Set thermostat to 24°C instead of 18-20°C and use sleep timer to cut 1 hour daily.",
                    'saved_kwh_month': round(saved_kwh, 1),
                    'saved_cost_month': saved_cost,
                    'saved_cost_year': round(saved_cost * 12, 0),
                    'difficulty': 'Immediate & Free'
                })

        # Ceiling fan recommendation (BLDC upgrade)
        if 'fan' in name_lower and app['power_watts'] >= 70:
            # Upgrade from 75W to 28W BLDC fan
            delta_watts = app['power_watts'] - 28.0
            saved_kwh = (delta_watts * app['hours_per_day'] * app['days_per_month'] * app['quantity']) / 1000.0
            saved_cost = round(saved_kwh * rate, 2)
            tips.append({
                'category': 'Appliance Upgrade',
                'title': f"Upgrade {app['name']} to 5-Star BLDC Fan",
                'action': f"Switching {app['quantity']} standard fan(s) to 28W BLDC saves ~65% fan energy with silent operation.",
                'saved_kwh_month': round(saved_kwh, 1),
                'saved_cost_month': saved_cost,
                'saved_cost_year': round(saved_cost * 12, 0),
                'difficulty': 'Equipment Upgrade (Payback ~14 months)'
            })

        # Water Geyser recommendation
        if 'geyser' in name_lower or 'water heater' in name_lower:
            if app['hours_per_day'] > 1.0:
                saved_kwh = (app['power_watts'] * 0.5 * app['days_per_month'] * app['quantity']) / 1000.0
                saved_cost = round(saved_kwh * rate, 2)
                tips.append({
                    'category': 'Heating',
                    'title': 'Install a Geyser Timer / Reduce Heating Time',
                    'action': 'Geysers reach peak temperature in 15-20 minutes. Turning off 30 minutes earlier saves substantial units.',
                    'saved_kwh_month': round(saved_kwh, 1),
                    'saved_cost_month': saved_cost,
                    'saved_cost_year': round(saved_cost * 12, 0),
                    'difficulty': 'Habit Change'
                })

        # Lighting recommendation
        if 'bulb' in name_lower or 'light' in name_lower or 'tube' in name_lower:
            if app['power_watts'] >= 36:
                delta_watts = app['power_watts'] - 9.0
                saved_kwh = (delta_watts * app['hours_per_day'] * app['days_per_month'] * app['quantity']) / 1000.0
                saved_cost = round(saved_kwh * rate, 2)
                tips.append({
                    'category': 'Lighting',
                    'title': 'Switch to Energy Efficient 9W LED Bulbs',
                    'action': f"Replace older tube lights or incandescent bulbs with high-lumen 9W LEDs.",
                    'saved_kwh_month': round(saved_kwh, 1),
                    'saved_cost_month': saved_cost,
                    'saved_cost_year': round(saved_cost * 12, 0),
                    'difficulty': 'Quick Low-Cost Fix'
                })

        # Desktop PC recommendation
        if 'pc' in name_lower or 'computer' in name_lower or 'desktop' in name_lower:
            tips.append({
                'category': 'Computing',
                'title': 'Activate OS Sleep Mode & Smart Power Strip',
                'action': 'Set computer monitor to sleep after 10 mins and shut off master socket at night to stop 5W continuous standby.',
                'saved_kwh_month': 5.4,
                'saved_cost_month': round(5.4 * rate, 2),
                'saved_cost_year': round(5.4 * rate * 12, 0),
                'difficulty': 'Immediate & Free'
            })

    # Default fallback tips if none matched
    if not tips:
        tips.append({
            'category': 'General',
            'title': 'Unplug Chargers & Standby Devices',
            'action': 'Mobile chargers and setup boxes draw 1-3W when plugged in even when switched off.',
            'saved_kwh_month': 4.0,
            'saved_cost_month': round(4.0 * rate, 2),
            'saved_cost_year': round(4.0 * rate * 12, 0),
            'difficulty': 'Immediate & Free'
        })

    return alerts, tips
