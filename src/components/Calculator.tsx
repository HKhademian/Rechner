import type { JSX } from 'preact';
import InputForm from './InputForm.tsx';
import ResultsDisplay from './ResultsDisplay.tsx';
import ComparisonTable from './ComparisonTable.tsx';
import Navigation from './Navigation.tsx';

export default function Calculator(): JSX.Element {
  return (
    <>
      <Navigation currentPath="/" />
      <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em' }}>
          German Net Pay Calculator
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Instantly see how your salary, tax bracket, state, and family situation affect your net income in Germany.
        </p>
      </div>

      <ComparisonTable />

      <div class="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
          <InputForm />
          <ResultsDisplay />
        </div>
      </div>
    </>
  );
}
