import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// ─────────────────────────────────────────────────────────────
// DOM SHIELD v2 — Protection robuste contre les crashs React
// Cause : Google Translate / extensions mutent le DOM pendant
//         que React effectue sa réconciliation (insertBefore).
// Stratégie : interception globale et résilience face aux nœuds orphelins
// ─────────────────────────────────────────────────────────────
if (typeof Node === 'function' && Node.prototype) {
  const _insertBefore = Node.prototype.insertBefore;
  (Node.prototype as any).insertBefore = function (newNode: Node, refNode: Node | null) {
    if (refNode && refNode.parentNode !== this) {
      try {
        return _insertBefore.call(this, newNode, null);
      } catch {
        console.warn('[DOM Shield] insertBefore absorbé (nœud orphelin)');
        return newNode;
      }
    }
    try {
      return _insertBefore.call(this, newNode, refNode);
    } catch {
      console.warn('[DOM Shield] insertBefore absorbé (erreur inattendue)');
      return newNode;
    }
  };

  const _removeChild = Node.prototype.removeChild;
  (Node.prototype as any).removeChild = function (child: Node) {
    if (child.parentNode !== this) {
      console.warn('[DOM Shield] removeChild absorbé (nœud orphelin)');
      return child;
    }
    try {
      return _removeChild.call(this, child);
    } catch {
      console.warn('[DOM Shield] removeChild absorbé (erreur inattendue)');
      return child;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
