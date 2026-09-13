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
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      try {
        return originalInsertBefore.call(this, newNode, null) as T;
      } catch {
        console.warn('[DOM Shield] insertBefore absorbé (nœud orphelin)');
        return newNode;
      }
    }
    try {
      return originalInsertBefore.call(this, newNode, refNode) as T;
    } catch {
      console.warn('[DOM Shield] insertBefore absorbé (erreur inattendue)');
      return newNode;
    }
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('[DOM Shield] removeChild absorbé (nœud orphelin)');
      return child;
    }
    try {
      return originalRemoveChild.call(this, child) as T;
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
