export default function AccessDenied({ onDashboard }: { onDashboard: () => void }) {
  return <section role="alert" style={{maxWidth:640,margin:'80px auto',textAlign:'center',padding:32,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:18}}>
    <div style={{fontSize:44}}>403</div><h1>Access Denied</h1>
    <p style={{color:'var(--text-secondary)'}}>Your account does not have permission to view this page. If your access recently changed, return to the dashboard or contact a Super Admin.</p>
    <button className="settings-primary-button" onClick={onDashboard}>Return to Dashboard</button>
  </section>
}
