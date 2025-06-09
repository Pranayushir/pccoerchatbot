from flask import Flask, request, jsonify, render_template
import json
import os
import google.generativeai as genai

app = Flask(__name__, static_folder="static", template_folder="templates")

# Configure Gemini API
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=api_key)

# Load FAQ data
faq_data = []
faq_file_path = "faq_data.json"

if os.path.exists(faq_file_path):
    try:
        with open(faq_file_path, 'r', encoding="utf-8") as file:
            faq_data = json.load(file)
            print(f"Loaded {len(faq_data)} FAQ items")
    except json.JSONDecodeError as e:
        print(f"Error reading FAQ file: {e}")
        faq_data = []
else:
    print("Error: FAQ dataset not found! Creating empty FAQ data.")
    with open(faq_file_path, 'w', encoding="utf-8") as file:
        json.dump(faq_data, file, indent=2)

# Maintain chat history (last 2 queries)
chat_history = []
MAX_HISTORY = 2

def find_best_answer(user_query):
    """Find exact match in FAQ data first"""
    user_query_lower = user_query.lower()
    
    for item in faq_data:
        if user_query_lower == item["question"].lower():
            return item["answer"]
    
    for item in faq_data:
        if user_query_lower in item["question"].lower() or item["question"].lower() in user_query_lower:
            return item["answer"]
    
    return None

def get_gemini_response(user_query):
    """Get response from Gemini API with context from last queries"""
    best_answer = find_best_answer(user_query)
    if best_answer:
        return best_answer

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Add history context
        history_context = ""
        if chat_history:
            for idx, past_q in enumerate(chat_history[-MAX_HISTORY:], 1):
                history_context += f"\nPrevious Query {idx}: {past_q}"

        if faq_data:
            faq_context = json.dumps(faq_data, indent=2)
            prompt = f"""You are an admission enquiry chatbot for Pimpri Chinchwad College of Engineering and Research (PCCOER).

{history_context}

User's Current Question: {user_query}

Based on the following FAQ data, answer clearly and concisely. If the answer is not in the FAQ, suggest contacting the college.

FAQ Data:
{faq_context}
"""
        else:
            prompt = f"""You are an admission enquiry chatbot for Pimpri Chinchwad College of Engineering and Research (PCCOER).

{history_context}

User's Current Question: {user_query}

Provide a helpful response. If you don't have specific information, suggest contacting the college directly."""

        response = model.generate_content(prompt)
        if response and response.text:
            return response.text.strip()
        else:
            return "I couldn't generate a proper response. Please contact the college directly for help."

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "I'm having trouble retrieving the information. Please try again later or contact the college directly."

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        user_message = data.get('message', '').strip()
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        print(f"User query: {user_message}")
        response = get_gemini_response(user_message)
        print(f"Bot response: {response}")

        # Update chat history
        chat_history.append(user_message)
        if len(chat_history) > MAX_HISTORY:
            chat_history.pop(0)

        return jsonify({"response": response})
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/health')
def health_check():
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        test_response = model.generate_content("Hello, are you working?")
        return jsonify({
            "status": "healthy",
            "gemini_api": "working",
            "faq_items": len(faq_data)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "gemini_api": "error",
            "error": str(e),
            "faq_items": len(faq_data)
        }), 500

if __name__ == '__main__':
    print("Starting Flask application...")
    print(f"FAQ data loaded: {len(faq_data)} items")
    app.run(debug=True, host='0.0.0.0', port=5000)
