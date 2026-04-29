# 🎨 RCA Dashboard -- Design Style Guide (Summary)

## 🧠 Core Philosophy

Design the dashboard to answer: What is happening → Why is it happening
→ What should be done

-   Prioritize business impact over raw ML output
-   Keep UI clean, structured, and decision-focused
-   Every section should lead to actionable insights

------------------------------------------------------------------------

## 🧱 Layout Structure

### 1. Top Section (Business KPIs)

-   Churn Rate / Target Metric\
-   High Risk Users (%)\
-   Revenue at Risk\
-   Model Performance (ROC / Accuracy)

------------------------------------------------------------------------

### 2. Middle Section (Analysis & Explanation)

-   Feature Importance (Top drivers)
-   SHAP Summary Plot
-   Driver Contribution (% impact)
-   Risk Segmentation (High / Medium / Low)

------------------------------------------------------------------------

### 3. Bottom Section (Insights & Actions)

-   Root Cause Insights
-   Segment Analysis
-   Recommended Actions

------------------------------------------------------------------------

## 🎨 Visual Style

### Colors

-   Background: Dark (#0f172a)
-   Cards: #1e293b
-   Red: Risk
-   Yellow: Warning
-   Green: Positive
-   Blue: Neutral

------------------------------------------------------------------------

### Typography

-   KPI Values: Large, bold
-   Section Titles: Medium
-   Insights: Readable

------------------------------------------------------------------------

### Components

-   Cards with rounded corners
-   Consistent spacing
-   Grid layout

------------------------------------------------------------------------

## 📊 Data Visualization

-   Bar charts for importance
-   SHAP plots for explainability
-   Pie/stacked charts for segmentation

------------------------------------------------------------------------

## ⚡ UX Guidelines

-   Simple flow: Upload → Analyze → Results
-   Show loading states
-   Allow export (JSON/report)
-   Dark mode friendly

------------------------------------------------------------------------

## 🎯 Key Value

-   Focus on impact
-   Translate ML → business insights
-   Drive decisions

------------------------------------------------------------------------

## 🧠 Final Note

A great dashboard enables clear decisions, not just visuals.
