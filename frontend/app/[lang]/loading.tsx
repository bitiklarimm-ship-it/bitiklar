/** Sahifa yuklanayotganda ko'rinadigan skelet. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="page-head girih">
        <div className="container">
          <div className="skel skel-line" style={{ width: 120 }} />
          <div className="skel skel-title" />
          <div className="skel skel-line" style={{ width: "40%" }} />
        </div>
      </section>
      <div className="container section">
        <div className="grid grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skel" style={{ aspectRatio: "4/3", borderRadius: 0 }} />
              <div className="card-body">
                <div className="skel skel-line" style={{ width: "80%" }} />
                <div className="skel skel-line" style={{ width: "50%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
