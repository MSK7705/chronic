import pandas as pd

# Read the Excel file
df = pd.read_excel('food_data.xlsx')

def search_food(food_query):
    """Search for food items containing the query string"""
    matches = df[df['food_name'].str.contains(food_query, case=False, na=False)]
    return matches

def display_nutrients(row):
    """Display nutritional information for a food item"""
    print("\n" + "="*80)
    print(f"Food Code: {row['food_code']}")
    print(f"Food Name: {row['food_name']}")
    print(f"Primary Source: {row['primarysource']}")
    print(f"\nNutritional Information (per 100g):")
    print(f"  Energy: {row['energy_kcal']:.2f} kcal ({row['energy_kj']:.2f} kJ)")
    print(f"  Carbohydrates: {row['carb_g']:.2f} g")
    print(f"  Protein: {row['protein_g']:.2f} g")
    print(f"  Fat: {row['fat_g']:.2f} g")
    print(f"  Free Sugar: {row['freesugar_g']:.2f} g")
    print(f"  Fiber: {row['fibre_g']:.2f} g")
    print(f"  SFA (Saturated Fat): {row['sfa_mg']:.2f} mg")
    print(f"  MUFA: {row['mufa_mg']:.2f} mg")
    print(f"  PUFA: {row['pufa_mg']:.2f} mg")
    print(f"  Cholesterol: {row['cholesterol_mg']:.2f} mg")
    print("="*80)

# Get input from user
food_query = input("Enter food name to search: ")

# Search for the food
results = search_food(food_query)

# Display results
if not results.empty:
    print(f"\nFound {len(results)} match(es) for '{food_query}':\n")
    
    # Display list with serial numbers
    print("Select a food item:")
    print("-" * 60)
    for idx, (index, row) in enumerate(results.iterrows(), start=1):
        print(f"{idx}. {row['food_name']} (Code: {row['food_code']})")
    print("-" * 60)
    
    # Get user selection
    try:
        choice = int(input("\nEnter the serial number to view nutrients: "))
        
        if 1 <= choice <= len(results):
            selected_row = results.iloc[choice - 1]
            display_nutrients(selected_row)
        else:
            print(f"Invalid choice! Please enter a number between 1 and {len(results)}")
    except ValueError:
        print("Invalid input! Please enter a number.")
else:
    print(f"\nNo matches found for '{food_query}'")
    print("Please try a different search term.")
