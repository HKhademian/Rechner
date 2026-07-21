import InputForm from './InputForm';
import ResultsDisplay from './ResultsDisplay';
import ComparisonTable from './ComparisonTable';

export default function Calculator() {
  return (
    <>
    <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
      <h1 style="font-size: 3rem; background: -webkit-linear-gradient(45deg, var(--primary), #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        German Net Pay Calculator
      </h1>
      <p style="color: #94a3b8; font-size: 1.1rem; max-width: 600px; margin: 0 auto;">
        Instantly see how your salary, tax bracket, state, and family situation affect your net income in Germany.
      </p>
    </div>
    
    <ComparisonTable />

    <div class="container">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
        <InputForm />
        <ResultsDisplay />
      </div>
    </div>
    </>
  );
}
