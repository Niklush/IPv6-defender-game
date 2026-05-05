# IPv6 Defender – Interaktives Security Training

**IPv6 Defender** ist eine interaktive React-Anwendung, die als Lernspiel für Netzwerk-Administratoren und Security-Spezialisten konzipiert wurde. In acht realistischen Missionen lernst du, IPv6-Netzwerke gegen Angriffe abzusichern, Protokoll-Schwachstellen zu analysieren und korrekte Cisco-IOS-Konfigurationen anzuwenden.

---

## 🚀 Features

* **8 Realistische Szenarien:** Von Rogue Router Advertisements bis hin zu BGP-Hijacking und Teredo-Tunneling.
* **Drei-Stufen-Lernkonzept:** Jede Mission umfasst:
    1.  **Analyse:** Was passiert gerade auf Protokollebene?
    2.  **Konfiguration:** Welcher Cisco-Befehl löst das Problem?
    3.  **Begründung:** Warum ist diese Maßnahme strukturell wichtig?
* **Gamification:**
    * Punktesystem (10 Punkte pro Frage, 5 bei Nutzung von Hinweisen).
    * Dynamisches Ranking-System (vom "Trainee" bis zum "Senior Security Architect").
    * Feedback-System mit detaillierten technischen Erklärungen zu jeder Antwort.
* **Modernes Design:** Dark-Mode-Interface im "Cyber-Operations"-Look, optimiert mit Tailwind CSS und Lucide-Icons.

---

## 🛠 Tech Stack

* **Framework:** [React.js](https://reactjs.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide-React](https://lucide.dev/)
* **Animationen:** Custom CSS Keyframes für ein immersives Terminal-Feeling.

---

## 📚 Missions-Übersicht

| ID | Titel | Fokus-Thema |
| :--- | :--- | :--- |
| 1 | Der gefälschte Router | RA-Guard & Rogue Router Advertisements |
| 2 | ICMPv6 – Alles oder Nichts? | RFC 4890 Konforme Filterung & PMTUD |
| 3 | Spuren im /64 | Privacy Extensions & Scanning-Prävention |
| 4 | Der Doppelstack-Albtraum | Dual-Stack Firewalling (IPv4 vs. IPv6 Regeln) |
| 5 | Der unsichtbare Tunnel | Teredo, 6to4 & Exfiltrationswege |
| 6 | Phantom-DHCP | DHCPv6 Guard & RDNSS-Optionen |
| 7 | Der NDP-Spion | Neighbor Discovery Spoofing & First Hop Security |
| 8 | Bogons und Hijacker | Bogon-Filterung & RPKI (BGP Security) |

---

## 💻 Installation & Start

Um die Komponente in ein bestehendes React-Projekt zu integrieren:

1.  **Voraussetzungen:**
    Stelle sicher, dass `lucide-react` und `tailwindcss` installiert sind.
    ```bash
    npm install lucide-react
    ```

2.  **Datei kopieren:**
    Speichere den Code als `IPv6Defender.jsx` in deinem `components`-Ordner.

3.  **Einbinden:**
    ```jsx
    import IPv6Defender from './components/IPv6Defender';

    function App() {
      return (
        <div className="App">
          <IPv6Defender />
        </div>
      );
    }
    ```

---

## 🎯 Zielgruppe

Dieses Tool wurde speziell für das **Lernfeld 7/8** der IT-Berufe (z.B. Fachinformatiker für Systemintegration) entwickelt. Es eignet sich ideal zur Prüfungsvorbereitung oder als interaktive Lab-Ergänzung für Cisco Networking Academy (NetAcad) Kurse.

---

> **Hinweis:** Die in den Missionen verwendeten Befehle beziehen sich auf den **Cisco IOS / IOS-XE** Standard und sind für die Verwendung in Simulatoren wie dem Cisco Packet Tracer oder GNS3 optimiert.
