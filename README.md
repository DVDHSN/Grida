# Grida: The AI-Native Spreadsheet

Grida is an intelligent, AI-driven spreadsheet application designed to revolutionize data interaction. It empowers users to transform raw, unstructured text into a fully functional, interactive spreadsheet through a conversational interface. Powered by Google's Gemini AI, Grida can clean data, generate insights, create visualizations, and perform complex data manipulations from simple natural language commands.

Whether you're starting from pasted data, generating a sheet from a prompt, or building from scratch, Grida's AI Copilot acts as your expert data analyst, making advanced spreadsheet functionalities accessible to everyone.

## ✨ Key Features

Based on the source code, Grida offers a rich set of features that blend traditional spreadsheet capabilities with powerful AI enhancements:

- **AI-Powered Data Ingestion**:
    - **Paste & Process**: Automatically cleans, structures, and analyzes raw text or CSV data pasted into the application.
    - **Generate from Template**: Creates a complete, ready-to-use spreadsheet with sample data from a natural language description (e.g., "a project management tracker").
    - **Start Empty**: Provides a blank canvas for traditional data entry.
- **Conversational AI Copilot**:
    - **Natural Language Commands**: Manipulate data by simply asking the AI (e.g., "delete all rows where region is 'North'", "sort by sales descending").
    - **Data Querying**: Ask questions about your data and receive instant answers, summaries, and insights.
    - **AI-Powered Editing**: The AI uses a robust set of tools for actions like find/replace, adding/deleting rows & columns, sorting, and filtering.
- **Advanced Spreadsheet Functionality**:
    - **Interactive Grid**: A fully-featured spreadsheet interface with cell editing, selection, resizing, and context menus.
    - **AI Chart Generation**: Automatically create various chart types (bar, line, pie, combo, etc.) from selected data or conversational prompts.
    - **Pivot Tables**: Generate and configure pivot tables manually or with AI assistance.
    - **Data Transformation**: A "Power Query"-like feature to clean, reshape, or merge data using natural language instructions.
    - **Conditional Formatting & Validation**: Apply complex formatting and data validation rules using AI-driven natural language prompts.
    - **AI-Driven Analysis**: Features like "Explain Sheet" for a full narrative summary, "Goal Seek" to solve for a target value, and predictive "Forecasting".
    - **Macros & Automation**: Generate and save sequences of actions (macros) to automate repetitive tasks.
    - **And More**: Named Ranges, Custom Views, What-If Data Tables, and formula support.
- **Intuitive User Experience**:
    - **Modern UI**: A clean, dark-themed interface built with React and Tailwind CSS.
    - **Modal-driven Workflow**: Complex features are handled in focused, easy-to-use modals.
    - **AI-Assisted Suggestions**: Features like "Flash Fill" to intelligently complete data patterns.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **AI**: [Google Gemini](https://ai.google.dev/) via `@google/genai` library
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charting**: [Chart.js](https://www.chartjs.org/)
- **Utilities**:
    - **SheetJS (xlsx)**: For parsing `.xlsx` file uploads.
    - **Marked**: For rendering Markdown in the chat panel and modals.

## 🚀 Installation & Setup

Follow these steps to get a local instance of Grida running.

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or a compatible package manager

**1. Clone the Repository**

```bash
git clone https://github.com/DVDHSN/Grida.git
cd Grida
```

**2. Install Dependencies**

```bash
npm install
```

**3. Set Up Environment Variables**

You need a Google Gemini API key to use the AI features.

- Create a file named `.env.local` in the root of the project.
- Add your API key to this file:

```.env.local
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
```

**4. Run the Development Server**

```bash
npm run dev
```

The application should now be running on `http://localhost:3000`.

## 💻 Usage

Once the application is running, you can start interacting with your data in several ways:

1.  **Input Your Data**:
    - **Paste Data**: Copy data from a CSV or spreadsheet and paste it directly into the text area.
    - **From Template**: Describe the spreadsheet you need, and let the AI generate it for you.
    - **Start Empty**: Create a blank grid and enter data manually.
2.  **Analyze Data**: Click the "Analyze Data" button. Grida's AI will process the input, structure it into a spreadsheet, and provide initial insights.
3.  **Interact with the Copilot**:
    - Use the chat panel on the right to talk to your data. Ask questions, request changes, or ask for visualizations.

### Example Prompts for the AI Copilot

| Goal                  | Example Prompt                                                 |
| --------------------- | -------------------------------------------------------------- |
| **Editing Data**      | "Change all instances of 'USA' to 'United States' in the Region column." |
| **Sorting & Filtering**| "Sort the data by Sales in descending order."                    |
| **Querying**          | "What are the total sales for the 'Electronics' category?"       |
| **Visualization**     | "Create a bar chart showing sales per region."                 |
| **Adding Data**       | "Add a new column called 'Discount' with a default value of 10%." |
| **Complex Tasks**     | "Create a pivot table to show the average sales for each product category by region." |

## 📁 File Structure

Here is a high-level overview of the key files and directories in the project:

```
.
├── public/                # Static assets
├── src/
│   ├── components/        # All React components for the UI
│   │   ├── EditableSpreadsheet.tsx # The core interactive grid component
│   │   ├── ChatPanel.tsx       # The AI copilot interface
│   │   ├── InputView.tsx       # The initial data input screen
│   │   ├── ...               # Numerous modals for advanced features
│   ├── services/
│   │   └── geminiService.ts  # All logic for interacting with the Gemini API
│   ├── types.ts             # TypeScript type definitions for the project
│   ├── App.tsx              # Main application component, manages state
│   └── index.tsx            # Entry point for the React application
├── .env.local             # Local environment variables (API key)
├── index.html             # The main HTML file
├── package.json           # Project dependencies and scripts
└── vite.config.ts         # Vite build configuration
```

## 🙌 Contributing

Contributions are welcome! If you have suggestions for improvements or want to add new features, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and commit them (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature-name`).
5.  Open a Pull Request.

Please ensure your code follows the existing style and that you provide a clear description of your changes.

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.

P.S: Wanna generate amazing complete and detailed readmes like this? Visit my github repo https://github.com/DVDHSN/AI-README-Generator
