# ⚡ Smart Electricity Bill & Energy Waste Analyzer (VoltWise)

> A full-featured, hardware-free web application for estimating electricity bills, identifying energy-hungry appliances, detecting vampire/phantom power waste, and simulating potential cost savings. Designed as a complete **College Computer Engineering Capstone / Semester Project**.

---

## 🌟 1. Project Overview

- **Project Title:** Smart Electricity Bill & Energy Waste Analyzer (VoltWise)
- **Problem Statement:** Many residential consumers, hostel students, and small shop owners receive monthly electricity bills without understanding which appliances contribute the most to their cost, or how small daily habit changes could drastically reduce their expenditure.
- **Proposed Solution:** A lightweight web application where users enter appliances, power ratings (W), daily operating hours, and local electricity tariffs. The system performs mathematical audits, visualizes breakdown charts, pinpoints energy waste, and simulates potential savings without requiring expensive IoT meters or smart plugs.

### Target Users
1. **College students & hostel residents** looking to manage room energy limits.
2. **Households** trying to reduce high electricity bills.
3. **Small retail shops & offices** budgeting utility expenses.
4. **Engineering students** presenting energy conservation principles for academic viva examinations.

---

## 🚀 2. Key Modules & Capabilities

### Module 1: Electricity Bill Calculator & Tariff Engine
- **Flexible Input Modes:** Enter previous & current meter readings (`Units = Current - Previous`), or enter monthly units (kWh) directly.
- **Configurable Tariff Support:**
  - **Flat Rate Mode:** Simple `Units × Rate`.
  - **Progressive Tiered Slabs:** Multi-tier Discom structure (e.g., 0–100 @ ₹3.75, 101–300 @ ₹6.50, 301–500 @ ₹8.75, >500 @ ₹11.20).
- **Utility Components:** Configurable fixed monthly charges, statutory electricity duty / taxes (%), and fuel surcharges.
- **Actual vs. Estimated Comparison:** Flags bill deviations with percentage accuracy indicators.

### Module 2: Appliance Energy Calculator & Manager
- **Appliance Registration:** Enter custom name, category, rated power (W), quantity, active daily hours, days per month, and standby watts.
- **Presets Library:** 20+ calibrated standard presets (Inverter AC, BLDC Fan, Refrigerator, LED, PC, Geyser, Microwave, Washing Machine, etc.).
- **Duty Cycle Adjustments:** Built-in duty cycle factor (~40%) for refrigeration compressors.
- **Ranking Engine:** Automatically ranks appliances from highest to lowest energy consumption with percentage share badges.

### Module 3: Energy Analytics Dashboard
- **Executive KPIs:** Total monthly kWh, Estimated monthly bill (₹), Daily averages, Top energy hog, Carbon footprint (kg CO₂e), and tree offset equivalents.
- **Interactive Visualizations (Chart.js):**
  - Appliance-wise consumption doughnut chart.
  - Category breakdown bar chart.
  - Multi-axis historical trend chart (monthly units vs. bill amount).
- **Automated Waste Alerts:** Flags heavy consumers (>25% of total bill) and phantom standby power drain (>3 kWh).

### Module 4: Energy Waste & Savings Simulator
- **Interactive "What-If" Slider:** Test reducing appliance runtime by 0.5 to 8 hours daily.
- **Appliance Upgrade Simulator:** Calculate ROI for switching old appliances to energy-efficient alternatives (e.g., 75W Fan → 28W BLDC, 60W bulb → 9W LED).
- **Side-by-Side Impact Matrix:** Real-time comparison of original vs. optimized power, runtime, monthly kWh, monthly ₹, annual ₹, and CO₂ reduction.
- **Tailored Conservation Tips:** Actionable recommendations automatically matched to registered appliances.

### Module 5: Reports & History
- **Historical Bill Logger:** Log past bills with meter readings, units, and seasonal notes.
- **PDF Energy Audit Report:** Professional multi-page PDF generation via **ReportLab** with summary tables, appliance breakdown, and recommendations.
- **CSV Data Export:** One-click tabular export of full appliance audit data.

### Module 6: Viva Voce & Theory Reference
- Full breakdown of all mathematical formulas.
- 7+ model viva questions & answers ready for academic defense.

---

## 📐 3. Mathematical Calculations (Viva Defense)

### A. Appliance Energy Consumption
$$\text{Energy (kWh)} = \frac{\text{Power (Watts)} \times \text{Hours/day} \times \text{Days/month} \times \text{Quantity}}{1000}$$

*Example:* A 75 W ceiling fan operated for 8 hours/day across 30 days consumes:
$$\frac{75 \times 8 \times 30 \times 1}{1000} = 18\text{ kWh}$$

### B. Estimated Electricity Cost
$$\text{Appliance Cost} = \text{Energy (kWh)} \times \text{Tariff Rate (₹/kWh)}$$
At ₹7.00/kWh: $18 \times ₹7 = ₹126.00$.

### C. Total Monthly Household Energy
$$E_{\text{total}} = \sum_{i=1}^{n} E_i$$

### D. Energy Savings from Reduced Usage
$$\Delta E = \frac{\text{Power (Watts)} \times (h_{\text{old}} - h_{\text{new}}) \times \text{Days} \times \text{Qty}}{1000}$$
$$\text{Monthly Savings (₹)} = \Delta E \times \text{Effective Rate}$$
$$\text{Annual Savings (₹)} = \text{Monthly Savings} \times 12$$

### E. Carbon Footprint & Tree Offset
$$\text{CO}_2 \text{ Emissions (kg)} = \text{Total kWh} \times 0.82\text{ kg CO}_2\text{e / kWh}$$
$$\text{Trees to Offset} = \frac{\text{Annual CO}_2\text{ (kg)}}{21\text{ kg CO}_2\text{ / tree / year}}$$

---

## 🛠️ 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3 (Flask) | Lightweight web server, calculation engine, REST API |
| **Database** | SQLite3 | Relational persistence for appliances, tariffs, history |
| **Frontend UI** | HTML5, Modern CSS | Dark theme dashboard, responsive grid, glassmorphism |
| **Interactivity** | Vanilla JavaScript | Real-time calculations, dynamic modals, sliders, AJAX |
| **Charts** | Chart.js 4.4 | Doughnut, category bar, and historical trend charts |
| **Math Rendering** | KaTeX | Fast LaTeX rendering on Viva Voce guide page |
| **PDF Generation** | ReportLab | Programmatic generation of energy audit PDF reports |

---

## 🗄️ 5. Database Schema

The database (`energy_analyzer.db`) is automatically initialized on first startup with pre-populated realistic demo data:

1. **`users`**: `(id, username, email, password_hash, created_at)`
2. **`appliances`**: `(id, user_id, name, category, power_watts, quantity, hours_per_day, days_per_month, standby_watts, standby_hours, created_at)`
3. **`tariffs`**: `(id, user_id, name, rate_type, flat_rate, fixed_charge, tax_percent, slab_json, is_default, created_at)`
4. **`bill_records`**: `(id, user_id, billing_period, prev_reading, curr_reading, units_consumed, tariff_rate, fixed_charge, tax_amount, estimated_amount, actual_amount, notes, created_at)`
5. **`saving_scenarios`**: `(id, user_id, scenario_name, details_json, monthly_saved_kwh, monthly_saved_cost, yearly_saved_cost, created_at)`

---

## 🏃 6. Quick Start & Execution

### 1. Prerequisites
- Python 3.9+ (Python 3.14 compatible)
- pip

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python app.py
```

### 4. Open in Browser
Navigate to:
```
http://127.0.0.1:5000
```

---

## 📂 7. Project File Structure

```
smart_electricity_analyzer/
├── app.py                     # Flask application routes, REST API, export handlers
├── database.py                # SQLite initialization, schema creation & sample data
├── calculator.py              # Mathematical calculation formulas, slabs & audit logic
├── pdf_generator.py           # ReportLab PDF energy audit report generator
├── requirements.txt           # Python dependencies (Flask, ReportLab, Pillow)
├── README.md                  # Comprehensive project documentation
├── static/
│   ├── css/
│   │   └── style.css          # Modern dark emerald UI theme & responsive layout
│   └── js/
│       ├── main.js            # Toast notifications & formatting helpers
│       ├── dashboard.js       # Chart.js visualizations & KPI updater
│       ├── appliances.js      # Appliance CRUD & interactive showcase calculator
│       ├── bill_calculator.js # Meter difference, slab breakdown, actual comparison
│       └── savings_simulator.js# What-if slider engine & upgrade simulator
└── templates/
    ├── base.html              # Core navigation layout, footer & CDN imports
    ├── dashboard.html         # Energy Analytics Dashboard
    ├── appliances.html        # Appliance Energy Calculator & Manager
    ├── bill_calculator.html   # Electricity Bill Calculator & Tariff Engine
    ├── savings_simulator.html # Energy Waste & Savings Analyzer
    ├── reports.html           # Historical Bill Tracker & Export Center
    └── viva_guide.html        # Viva Voce Examination & Formula Guide
```

---

## 🎓 8. College Project Evaluation Highlights

- **Hardware-Independent:** Zero dependency on costly smart plugs or microcontrollers.
- **Real-World Impact:** Immediate utility for households and hostel students to curb power bills.
- **Clean Architecture:** Modular separation of concerns (Routes, Calculations, PDF generation, Database models).
- **Visual Analytics:** Interactive graphical representations of power distribution.
- **Viva Voce Defense Ready:** Full mathematical derivations and viva preparation guide built into the app.
