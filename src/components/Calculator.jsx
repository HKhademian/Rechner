import InputForm from './InputForm';
import ResultsDisplay from './ResultsDisplay';
import ComparisonTable from './ComparisonTable';
import Navigation from './Navigation';

export default function Calculator() {
  return (
    <>
    <Navigation currentPath="/" />
    <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
      <h1 style="font-size: 2.8rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.03em;">
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
