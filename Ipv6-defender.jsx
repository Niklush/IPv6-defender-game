import React, { useState, useEffect } from “react”;
import { Shield, Terminal, AlertTriangle, CheckCircle2, XCircle, Lightbulb, ChevronRight, Trophy, RotateCcw, Lock, Zap, Eye, Server, Network, Radio, GitBranch, Cpu } from “lucide-react”;

// ============================================================
// MISSIONSDATEN
// ============================================================
const MISSIONS = [
{
id: 1,
title: “Der gefälschte Router”,
topic: “RA-Guard / Rogue Router Advertisement”,
icon: Radio,
difficulty: “Einsteiger”,
briefing: `Ein Praktikant meldet sich bei dir: “Seit heute Morgen verhalten sich einige Notebooks im Schulungsraum komisch. Sie haben plötzlich ein neues Default-Gateway, das nicht unser Router ist – die Adresse fe80::13:37:1 taucht auf.”

Du wirfst einen Blick auf den Switch und siehst auf Port Gi1/0/12 einen unbekannten Laptop. Im Wireshark-Mitschnitt fallen verdächtige Router Advertisements (ICMPv6 Type 134) auf, die von genau dieser Maschine ausgehen.`, questions: [ { type: "analyse", prompt: "Was passiert hier auf Protokollebene?", options: [ { text: "Ein Angreifer betreibt ARP-Spoofing über das IPv6-Subnetz.", correct: false, explanation: "Unter IPv6 gibt es kein ARP. Der Mechanismus ist NDP, und der konkrete Angriff hier nutzt gefälschte Router Advertisements – das ist etwas anderes als Neighbor-Spoofing." }, { text: "Der Angreifer-Laptop sendet gefälschte Router Advertisements und macht sich als Default Gateway bekannt – Clients akzeptieren das via SLAAC.", correct: true, explanation: "Genau richtig. RAs sind ICMPv6 Type 134. SLAAC-Clients akzeptieren standardmäßig jeden RA aus ihrem Link – ohne zusätzliche Schutzmaßnahmen gibt es keinen Authentizitätsbeweis." }, { text: "Ein Konfigurationsfehler im DHCPv6-Server verteilt falsche Gateway-Optionen.", correct: false, explanation: "DHCPv6 verteilt – im Gegensatz zu DHCPv4 – kein Default-Gateway. Diese Information kommt ausschließlich aus Router Advertisements." }, { text: "Der Switch hat eine Schleife im Spanning Tree und leitet Pakete über den falschen Port.", correct: false, explanation: "STP-Probleme würden zu Broadcast-Stürmen oder Unreachables führen, nicht zur sauberen Umleitung über einen anderen Gateway." } ] }, { type: "config", prompt: "Du willst RA-Guard auf dem Cisco-Switch aktivieren, sodass Port Gi1/0/12 keine Router Advertisements mehr empfangen darf. Welche Konfiguration ist korrekt?", options: [ { text: `Switch(config)# ipv6 nd raguard policy HOST_POLICY\nSwitch(config-nd-raguard)# device-role host\nSwitch(config)# interface gi1/0/12\nSwitch(config-if)# ipv6 nd raguard attach-policy HOST_POLICY`, correct: true, explanation: "Das ist der richtige Cisco-Workflow: Policy definieren, device-role auf 'host' setzen (= darf keine RAs senden), Policy am Port attachen. Auf Uplinks zu echten Routern setzt man stattdessen 'device-role router'." }, { text: `Switch(config)# interface gi1/0/12\nSwitch(config-if)# ipv6 nd ra suppress\nSwitch(config-if)# no ipv6 router-advertisement`, correct: false, explanation: "Diese Befehle existieren so nicht in Cisco IOS. 'ipv6 nd ra suppress' wirkt nur auf Routern und unterdrückt eigene RAs – schützt aber nicht vor empfangenen Fake-RAs." }, { text: `Switch(config)# ipv6 access-list BLOCK_RA\nSwitch(config-ipv6-acl)# deny icmp any any 134\nSwitch(config)# interface gi1/0/12\nSwitch(config-if)# ipv6 traffic-filter BLOCK_RA in`, correct: false, explanation: "Funktioniert technisch theoretisch, aber: Cisco bietet mit RA-Guard eine speziell für diesen Zweck optimierte Funktion auf L2-Ebene. Sie ist effizienter, kennt das Konzept 'device-role' und ist wartungsärmer als manuelle ACLs an jedem Port." }, { text: `Switch(config)# ipv6 dhcp guard policy HOST_POLICY\nSwitch(config-dhcp-guard)# device-role client\nSwitch(config-if)# ipv6 dhcp guard attach-policy HOST_POLICY`, correct: false, explanation: "Das ist DHCPv6 Guard – schützt vor Rogue-DHCPv6-Servern, aber nicht vor gefälschten Router Advertisements. Beides sind Komponenten der First Hop Security, decken aber unterschiedliche Angriffe ab." } ] }, { type: "begruendung", prompt: "Warum ist dieser Angriff unter IPv6 in einem typischen Unternehmensnetz strukturell gefährlicher als ARP-Spoofing unter IPv4?", options: [ { text: "Weil IPv6-Pakete nicht verschlüsselt werden können.", correct: false, explanation: "Falsch – IPv6 unterstützt IPsec sogar nativer als IPv4. Mit der Bedrohungslage hat das nichts zu tun." }, { text: "Weil SLAAC im Gegensatz zu DHCPv4 standardmäßig automatisch jedem RA vertraut und keinen Server-Authentifizierungsmechanismus vorsieht – während gegen ARP-Spoofing in vielen Netzen mittlerweile DAI etabliert ist.", correct: true, explanation: "Exakt. Hinzu kommt: SEND (Secure Neighbor Discovery, RFC 3971) wäre die kryptografische Antwort, ist aber praktisch nirgends ausgerollt. Deshalb ist RA-Guard auf dem Switch der pragmatische Standard." }, { text: "Weil IPv6-Adressen länger sind und der Angreifer dadurch mehr Tarnmöglichkeiten hat.", correct: false, explanation: "Die Adresslänge ist nicht das Problem – das Vertrauensmodell der Autokonfiguration ist es." }, { text: "Weil ICMPv6 nicht gefiltert werden darf und der Angriff daher unvermeidbar ist.", correct: false, explanation: "ICMPv6 darf sehr wohl gefiltert werden – es darf nur nicht komplett geblockt werden. Spezifische Filterung (etwa Type 134 von untrusted Ports) ist genau das, was RA-Guard tut." } ] } ] }, { id: 2, title: "ICMPv6 – Alles oder Nichts?", topic: "ICMPv6-Filterung nach RFC 4890", icon: Zap, difficulty: "Einsteiger", briefing: `Bei einem externen Sicherheitsaudit kommt der Auditor mit einer klaren Forderung um die Ecke: “Aus Sicherheitsgründen muss ICMPv6 am Perimeter komplett geblockt werden – so wie wir das früher mit ICMP unter IPv4 gemacht haben.”

Du widersprichst. Der Auditor ist irritiert. Du musst deine Position fachlich begründen können.`, questions: [ { type: "analyse", prompt: "Was bricht zuerst kaputt, wenn du ICMPv6 vollständig blockst?", options: [ { text: "Nichts Wesentliches – ICMPv6 ist genau wie ICMP unter IPv4 nur für Diagnose-Tools wie ping nötig.", correct: false, explanation: "Genau das ist der gefährliche Trugschluss. ICMPv6 ist in IPv6 strukturell anders eingebettet als ICMP in IPv4." }, { text: "Path MTU Discovery, Neighbor Discovery und SLAAC funktionieren nicht mehr – das Netz ist effektiv tot.", correct: true, explanation: "Korrekt. PMTUD braucht Type 2 (Packet Too Big), NDP braucht Types 135/136, RAs sind Type 134. Ohne diese Mechanismen funktioniert IPv6 schlicht nicht." }, { text: "Nur ping6 funktioniert nicht mehr, alles andere läuft normal weiter.", correct: false, explanation: "Das wäre der Fall, wenn man nur Echo Request/Reply blocken würde. Ein vollständiger Block reißt aber die ganze Adresskonfiguration und Pfadoptimierung ab." }, { text: "DNS-Auflösung schlägt fehl, weil DNSSEC ICMPv6 benötigt.", correct: false, explanation: "DNSSEC nutzt UDP/TCP auf Port 53, keinen ICMPv6." } ] }, { type: "config", prompt: "Du erstellst eine ACL am Perimeter-Router. Welche der folgenden ICMPv6-Typen müssen vom WAN nach innen erlaubt sein, damit der grundlegende Betrieb nicht zusammenbricht (RFC 4890)?", options: [ { text: "Type 1 (Destination Unreachable), Type 2 (Packet Too Big), Type 3 (Time Exceeded), Type 4 (Parameter Problem) – Echo Request/Reply optional", correct: true, explanation: "Das ist der RFC-4890-konforme Mindestsatz für 'transit traffic'. Type 134 (RA), 135/136 (NS/NA) gehören explizit NICHT dazu – die haben am Perimeter nichts zu suchen, da link-local." }, { text: "Alle ICMPv6-Typen ohne Einschränkung – sonst bricht etwas.", correct: false, explanation: "Zu pauschal. Insbesondere Router Advertisements (134) und Neighbor Discovery (135/136) gehören am Perimeter geblockt – die sind link-local und am WAN-Interface ein Angriffsindikator." }, { text: "Nur Type 128 und 129 (Echo Request/Reply) – das ist klassisches ping.", correct: false, explanation: "Echo ist optional. Ohne Type 2 (Packet Too Big) funktioniert PMTUD nicht – Folge: schwarze Löcher bei größeren Paketen, die nirgends ankommen." }, { text: "Type 134 (Router Advertisement) und Type 135/136 (Neighbor Solicitation/Advertisement) – die wichtigsten NDP-Typen.", correct: false, explanation: "Genau diese gehören am WAN-Interface NICHT akzeptiert – sie sind link-local und würden externe RA-Spoofing-Angriffe erst ermöglichen." } ] }, { type: "begruendung", prompt: "Was ist die schwerwiegendste Folge, wenn du Type 2 (Packet Too Big) blockst?", options: [ { text: "ping6 funktioniert nicht mehr.", correct: false, explanation: "Ping nutzt Type 128/129, nicht Type 2." }, { text: "Path MTU Discovery bricht zusammen – größere Pakete verschwinden im 'Black Hole', Verbindungen hängen oder werden abgebrochen, ohne dass die Ursache offensichtlich ist.", correct: true, explanation: "Genau. Unter IPv6 fragmentieren Router NICHT mehr – das macht nur der Sender, und zwar nur, wenn er die Path MTU kennt. Ohne Type 2 bekommt er keine Rückmeldung und schickt zu große Pakete, die unterwegs verworfen werden – ohne dass eine Fehlermeldung zurückkommt. Klassisches PMTUD-Black-Hole." }, { text: "Die Firewall blockiert plötzlich auch HTTP-Verbindungen.", correct: false, explanation: "Direkt nicht – aber indirekt können HTTPS-Verbindungen mit großen Zertifikaten ins PMTUD-Loch fallen. Das ist eine Folge, nicht die Ursache." }, { text: "Der DHCPv6-Server reagiert nicht mehr.", correct: false, explanation: "DHCPv6 läuft über UDP/546+547, hat mit ICMPv6 Type 2 nichts zu tun." } ] } ] }, { id: 3, title: "Spuren im /64", topic: "Adressraum, Privacy Extensions, Scanning", icon: Eye, difficulty: "Mittel", briefing: `Ein externer Pen-Tester behauptet im Abschlussgespräch: “Ich habe binnen 20 Minuten alle Server in eurem /64-Subnetz gefunden – obwohl ein /64 ja angeblich ‘unscanbar’ ist.”

Du erinnerst dich: 2^64 ≈ 1,8 × 10^19 Adressen. Bei 1 Million Pings pro Sekunde würde ein vollständiger Scan ~580.000 Jahre dauern. Wie hat er es trotzdem geschafft?`, questions: [ { type: "analyse", prompt: "Welche Strategie nutzt der Pen-Tester am wahrscheinlichsten?", options: [ { text: "Er scannt vorhersagbare Adressen: ::1, ::2, ::53, ::80, EUI-64-abgeleitete Adressen, sequenzielle Server-Adressen wie ::100, ::200 – kombiniert mit DNS-Reverse-Lookups und PTR-Records.", correct: true, explanation: "Genau das. Der große Adressraum ist nur dann ein Schutz, wenn die Adressen wirklich zufällig verteilt sind. In der Praxis vergeben Admins gerne ::1 für Router, ::53 für DNS, ::25 für Mail – das verkleinert den effektiven Suchraum dramatisch." }, { text: "Er nutzt einen ICMPv6-Multicast-Ping an ff02::1 und alle Hosts antworten.", correct: false, explanation: "Hinzugefügt sei: ff02::1 ist link-local, der Pen-Tester ist remote. Außerdem antworten viele Hosts standardmäßig nicht auf Multicast-Pings." }, { text: "Er hat den IPv6-Header gespooft und sich als Router ausgegeben.", correct: false, explanation: "Das wäre ein anderer Angriff (RA-Spoofing) und würde ihm vom Internet aus gar keine Erkennung erlauben – RAs sind link-local." }, { text: "Er nutzt den BGP-Looking-Glass und bekommt alle Adressen frei Haus.", correct: false, explanation: "BGP zeigt nur Präfixe, keine einzelnen Hostadressen. Das hilft beim Scope-Eingrenzen, nicht beim Finden konkreter Hosts." } ] }, { type: "config", prompt: "Welche der folgenden Maßnahmen hilft am wirkungsvollsten gegen Scans, die auf vorhersagbaren Adressen basieren?", options: [ { text: "Privacy Extensions für Clients aktivieren UND Server-Adressen kryptografisch zufällig vergeben (z. B. fd00:abcd:1234::a3f4:9c1e:b27d:e8f1 statt ::1) – plus restriktive DNS-Zonen ohne öffentliche AAAA-Records für interne Systeme.", correct: true, explanation: "Defense in Depth: Privacy Extensions (RFC 4941) für Clients, hochentropische Server-IIDs (RFC 7217 / 'stable privacy addresses' für stabile aber unvorhersagbare Adressen), und DNS-Härtung. Die Kombination ist der Schlüssel." }, { text: "Auf jedem Host die IPv6-Stack komplett deaktivieren.", correct: false, explanation: "Das ist keine Lösung – das ist Vermeidung. Außerdem funktionieren moderne Betriebssysteme oft schlechter ohne IPv6 als mit." }, { text: "Ein /128 für jeden Host vergeben statt /64.", correct: false, explanation: "Das ist ein syntaktisches Missverständnis. /128 IST eine einzelne Hostadresse. Das Subnetz bleibt /64, sonst funktioniert SLAAC nicht (RFC 4291)." }, { text: "ICMPv6 vollständig am Host blocken.", correct: false, explanation: "Wir hatten in Mission 2 gesehen, warum das eine schlechte Idee ist. Außerdem schützt es nicht vor TCP-basierten Scans." } ] }, { type: "begruendung", prompt: "Welcher zusätzliche Vektor wird oft vergessen und macht selbst zufällige Adressen auffindbar?", options: [ { text: "Reverse DNS und öffentliche Logs: AAAA-Records, DNSSEC-Zonenwalking (NSEC), Certificate-Transparency-Logs, Webserver-Logs in Suchmaschinen-Caches.", correct: true, explanation: "Der entscheidende Punkt. Eine perfekt zufällige Adresse hilft nichts, wenn sie unter mail.firma.de im DNS steht. Plus: NSEC-Records bei DNSSEC ohne NSEC3 erlauben Zonen-Aufzählung." }, { text: "Die TTL-Werte der IPv6-Pakete verraten die Adressen.", correct: false, explanation: "TTL (in IPv6: Hop Limit) verrät grobe Distanzen, keine Adressen." }, { text: "MAC-Adressen werden bei IPv6 immer im Klartext übertragen.", correct: false, explanation: "Nur bei EUI-64. Mit Privacy Extensions oder RFC-7217-Adressen ist das nicht der Fall." }, { text: "Jedes IPv6-Paket enthält einen Hash der Quell-Adresse im Header.", correct: false, explanation: "Das gibt es nicht. Reine Erfindung." } ] } ] }, { id: 4, title: "Der Doppelstack-Albtraum", topic: "Dual-Stack-Firewallregelwerk", icon: Shield, difficulty: "Mittel", briefing: `Nach der Migration zu Dual-Stack meldet das SOC einen brisanten Befund: Auf einem Webserver, der laut IPv4-Firewallregelwerk nur auf Port 443 erreichbar sein soll, sind via IPv6 plötzlich SSH (22), MySQL (3306) und sogar ein vergessener Redis (6379) offen.

Im IPv4-Regelwerk ist alles korrekt. Das IPv6-Regelwerk ist… leer. Der Server hat eine globale IPv6-Adresse aus SLAAC und ist über IPv6 voll exponiert.`, questions: [ { type: "analyse", prompt: "Was ist die strukturelle Ursache für dieses Problem?", options: [ { text: "IPv6 hat im Linux-Kernel grundsätzlich Vorrang vor IPv4 und ignoriert iptables-Regeln.", correct: false, explanation: "Stimmt nicht. IPv4-Regeln wirken auf IPv4, IPv6-Regeln (ip6tables) auf IPv6 – beides ist gleichwertig. Das Problem ist konzeptionell, nicht technisch." }, { text: "Viele Firewalls behandeln IPv4 und IPv6 als getrennte Regelwerke. Wenn man nur IPv4 konfiguriert hat, ist das IPv6-Regelwerk implizit leer = allow all. Bei iptables/ip6tables ist das ein klassischer Fehler.", correct: true, explanation: "Genau das. ip6tables ist eine eigenständige Tabelle. nftables ist hier moderner – ein einziges Regelwerk für IPv4 und IPv6 (inet-Table). Bei Cisco-IOS sind IPv4- und IPv6-ACLs ebenfalls separat." }, { text: "SLAAC vergibt automatisch öffentliche Adressen, die jede Firewall umgehen.", correct: false, explanation: "SLAAC vergibt zwar Adressen, aber Pakete laufen weiterhin durch die Firewall – wenn eine konfiguriert ist." }, { text: "Die NAT-Funktion fehlt unter IPv6 und schaltet damit auch jede Firewall ab.", correct: false, explanation: "Das ist der häufigste Denkfehler überhaupt. NAT ist KEINE Firewall. NAT war bei IPv4 ein Nebeneffekt-Schutz durch Adressknappheit – eine Stateful Firewall macht den eigentlichen Schutz, und die gibt es unter IPv6 genauso." } ] }, { type: "config", prompt: "Du implementierst auf einem Cisco-Router eine restriktive IPv6-ACL für eingehenden Webserver-Traffic (nur HTTPS erlaubt, NDP/PMTUD muss funktionieren). Welche ACL ist sinnvoll?", options: [ { text: `ipv6 access-list WEB_IN\n permit tcp any host 2001:db8::25 eq 443\n permit icmp any any nd-ns\n permit icmp any any nd-na\n permit icmp any any packet-too-big\n permit icmp any any unreachable\n deny ipv6 any any log`, correct: true, explanation: "Saubere Logik: HTTPS zum Server erlauben, kritische ICMPv6-Typen (Neighbor Discovery + PMTUD + Diagnose) explizit zulassen, alles andere mit Logging blocken. Das 'log' am Ende ist Gold wert für die Forensik." }, { text: `ipv6 access-list WEB_IN\n permit tcp any any eq 443\n deny ipv6 any any`, correct: false, explanation: "Funktioniert für HTTPS, aber bricht NDP und PMTUD – nach kurzer Zeit hängt das Subnetz, weil Neighbor Solicitations nicht mehr beantwortet werden können." }, { text: `ipv6 access-list WEB_IN\n permit ipv6 any any\n deny tcp any any eq 22`, correct: false, explanation: "Falsche Logik der ACL-Reihenfolge – das erste 'permit ipv6 any any' matched alles, das zweite Statement wird nie erreicht. Cisco-ACLs werden top-down ausgewertet, mit first-match." }, { text: `ipv6 access-list WEB_IN\n deny ipv6 any any\n permit tcp any host 2001:db8::25 eq 443`, correct: false, explanation: "Reihenfolge falsch herum – 'deny ipv6 any any' am Anfang blockt alles, nichts kommt mehr durch. Klassischer Konfigurationsfehler bei ACLs." } ] }, { type: "begruendung", prompt: "Warum ist der Mythos 'NAT = Sicherheit' unter IPv6 besonders gefährlich?", options: [ { text: "Weil unter IPv4 NAT zwar als Sicherheits-Krücke wirkte, der eigentliche Schutz aber von der Stateful Firewall kam – wer das nicht verinnerlicht hat, baut unter IPv6 mit globalen Adressen ohne NAT plötzlich offene Netze.", correct: true, explanation: "Treffer. NAT verhinderte unter IPv4, dass externe Hosts ohne aktive Verbindung Pakete an interne Hosts schicken konnten – das übernimmt aber technisch die Stateful Firewall, nicht die Adressübersetzung. Unter IPv6 hat man globale Adressen → braucht zwingend ein bewusst designtes Firewall-Konzept." }, { text: "Weil NAT unter IPv6 verboten ist (RFC).", correct: false, explanation: "NAT66/NPTv6 gibt es zwar (RFC 6296), wird aber nicht empfohlen und ist nicht das Thema – der Punkt ist konzeptionell, nicht regulatorisch." }, { text: "Weil IPv6 keine privaten Adressbereiche kennt.", correct: false, explanation: "Doch – ULA (fc00::/7) ist das IPv6-Pendant zu RFC1918. Aber ULA-Hosts sind trotzdem ohne Firewall ungeschützt im LAN-Segment." }, { text: "Weil unter IPv6 jeder Router automatisch alle Pakete weiterroutet.", correct: false, explanation: "Router routen, was die Routing-Tabelle hergibt – unter IPv4 wie IPv6 gleich. Der Punkt ist die fehlende implizite Filterung durch NAT." } ] } ] }, { id: 5, title: "Der unsichtbare Tunnel", topic: "Tunnel-Protokolle (Teredo, 6to4, ISATAP)", icon: GitBranch, difficulty: "Mittel", briefing: `Das SIEM zeigt Alarm: Trotz strikter IPv4-Firewall (nur HTTP/HTTPS outbound erlaubt) verlassen IPv6-Pakete das Netz. Der Außenstellen-PC hat keine IPv6-Adresse aus eurem Präfix, aber im Traffic-Mitschnitt taucht eine Adresse aus 2001:0::/32 auf. UDP-Verkehr nach Port 3544 fällt zusätzlich auf.`, questions: [ { type: "analyse", prompt: "Welcher Mechanismus ist hier aktiv?", options: [ { text: "Teredo-Tunneling: IPv6 wird über UDP/3544 in IPv4 gekapselt – funktioniert sogar durch NAT hindurch und ist bei Windows lange Zeit standardmäßig aktiv gewesen.", correct: true, explanation: "Exakt. Teredo nutzt 2001::/32 als Präfix, Server lauschen auf UDP/3544. Es war bei Windows Vista bis Windows 10 (frühe Versionen) per Default aktiv. Das macht es zu einem unterschätzten Exfiltrations- und Bypass-Vektor." }, { text: "ISATAP – Intra-Site Automatic Tunnel Addressing Protocol.", correct: false, explanation: "ISATAP nutzt das Präfix des Site-Routers mit eingebetteter IPv4-Adresse im IID, nicht 2001::/32. Außerdem ist es intra-site, nicht für Internet-Tunnels gedacht." }, { text: "6to4-Tunnel.", correct: false, explanation: "6to4 nutzt 2002::/16 (mit eingebetteter IPv4 im Präfix), nicht 2001::/32. UDP/3544 ist auch nicht der 6to4-Mechanismus – 6to4 nutzt Protokoll 41 (IPv6-in-IPv4)." }, { text: "Native Dual-Stack mit DHCPv6.", correct: false, explanation: "Wenn das funktionieren würde, hätte der Host eine reguläre Adresse aus dem Unternehmens-Präfix, nicht aus 2001::/32." } ] }, { type: "config", prompt: "Wie blockst du Teredo robust auf einem Cisco-Router am Perimeter?", options: [ { text: `ip access-list extended BLOCK_TEREDO\n deny udp any any eq 3544\n deny udp any eq 3544 any\n permit ip any any\n!\ninterface gi0/1\n ip access-group BLOCK_TEREDO in\n!\nipv6 access-list BLOCK_TEREDO_V6\n deny ipv6 2001::/32 any\n permit ipv6 any any`, correct: true, explanation: "Doppelt gemoppelt: UDP/3544 in beide Richtungen blocken (so kommt der Teredo-Tunnel gar nicht erst zustande), UND das Teredo-Präfix 2001::/32 in der IPv6-ACL filtern (falls Pakete doch durchkommen). Plus: per GPO Teredo auf den Clients abschalten – aber das ist eine andere Ebene." }, { text: `ipv6 access-list BLOCK_TUNNELS\n deny ipv6 any any`, correct: false, explanation: "Killt jeden IPv6-Verkehr, nicht nur Tunnels. Außerdem hilft es bei einem IPv4-gekapselten Tunnel überhaupt nichts – der IPv6-Filter sieht den IPv4-UDP-Verkehr ja gar nicht." }, { text: `interface gi0/1\n no ipv6 enable`, correct: false, explanation: "Schaltet IPv6 am Router-Interface ab – ändert aber nichts daran, dass der Client den UDP/3544-Tunnel über IPv4 aufbaut. Genau das ist Teredos Trick." }, { text: `ip access-list extended BLOCK\n deny tcp any any eq 41\n permit ip any any`, correct: false, explanation: "Mehrere Fehler: 6to4 nutzt Protokoll 41 (kein TCP-Port), Teredo nutzt UDP/3544. Hier wird das Falsche geblockt." } ] }, { type: "begruendung", prompt: "Warum ist Teredo besonders heikel und nicht 'nur' ein Legacy-Problem?", options: [ { text: "Es funktioniert durch NAT hindurch, baut spontan eine IPv6-Konnektivität auf, ohne dass IT-Admins davon wissen, und kann Endpoint-Sicherheitskonzepte umgehen, die nur IPv4-Traffic prüfen.", correct: true, explanation: "Genau das ist der Punkt. Teredo wurde explizit für NAT-Traversal entworfen. In einem Netz, das nur IPv4 monitort, entsteht damit ein blinder Fleck – Malware kann ihn aktiv nutzen für C2-Verbindungen." }, { text: "Weil Teredo ein verschlüsseltes Tunneling-Protokoll ist und Inhalte nicht inspizierbar sind.", correct: false, explanation: "Teredo ist NICHT verschlüsselt – es ist nur ein Encapsulation-Mechanismus. Eine Inspektion ist möglich, wenn man weiß, was man sucht." }, { text: "Weil Teredo ein RFC-Standard und damit unblockbar ist.", correct: false, explanation: "Es ist RFC 4380, aber Standards sind selbstverständlich filterbar." }, { text: "Weil Teredo Pakete fragmentiert und damit jede Firewall umgeht.", correct: false, explanation: "Fragmentierung ist ein anderes Thema. Teredos Stärke ist NAT-Traversal, nicht Fragmentierung." } ] } ] }, { id: 6, title: "Phantom-DHCP", topic: "DHCPv6 Guard / Rogue DHCP", icon: Server, difficulty: "Mittel", briefing: `Mehrere Clients im Verwaltungsnetz melden, dass DNS-Auflösungen plötzlich auf eine ihnen unbekannte Adresse 2001:db8:bad::1 zeigen. Eure DHCPv6-Server stehen aber unter 2001:db8:cafe::53 und sollten die einzigen sein, die DNS-Optionen verteilen. Im Wireshark siehst du DHCPv6-REPLY-Pakete von einem unautorisierten Host an Gi1/0/8.`, questions: [ { type: "analyse", prompt: "Welche Mechanismen können in einem IPv6-Netz für DNS-Server-Information verantwortlich sein?", options: [ { text: "DHCPv6 (Stateful oder Stateless) und RDNSS-Option in Router Advertisements (RFC 8106) – beide können koexistieren, gesteuert über M- und O-Flag im RA.", correct: true, explanation: "Genau. M-Flag (Managed) = DHCPv6 für Adressen, O-Flag (Other) = DHCPv6 nur für sonstige Optionen wie DNS. Ohne diese Flags kommt RDNSS aus dem RA selbst. Saubere Policy festlegen ist kritisch – sonst gibt es zwei konkurrierende Quellen." }, { text: "Nur DHCPv6 – Router Advertisements können keine DNS-Server transportieren.", correct: false, explanation: "Falsch. RDNSS-Option (RFC 8106) erlaubt DNS-Server in RAs. Das war historisch eine Lücke, ist aber seit ~2010 standardisiert." }, { text: "Ausschließlich statische Konfiguration auf den Clients.", correct: false, explanation: "Möglich, aber nicht das einzige. Die Frage ist, was im realen Netz passiert." }, { text: "Nur die DNS-Option im DHCPv4-Lease.", correct: false, explanation: "Das wäre der IPv4-Pfad – aber wir reden über IPv6-spezifische Mechanismen." } ] }, { type: "config", prompt: "Welche Konfiguration auf einem Cisco-Switch verhindert Rogue-DHCPv6-Server zuverlässig?", options: [ { text: `ipv6 dhcp guard policy SERVER_POLICY\n device-role server\n match server access-list TRUSTED_DHCP_SERVERS\n!\nipv6 dhcp guard policy CLIENT_POLICY\n device-role client\n!\ninterface gi1/0/24\n ipv6 dhcp guard attach-policy SERVER_POLICY\n!\ninterface range gi1/0/1 - 23\n ipv6 dhcp guard attach-policy CLIENT_POLICY`, correct: true, explanation: "Vollständig: Auf dem Uplink zum legitimen DHCPv6-Server gilt 'server'-Rolle mit ACL für trusted Adressen. Alle Client-Ports bekommen 'client'-Rolle – sie dürfen keine DHCPv6-Server-Pakete senden. Das ist exakt das Pendant zu DHCP Snooping unter IPv4." }, { text: `ipv6 access-list NO_DHCP\n deny udp any eq 547 any\n permit ipv6 any any\n!\ninterface gi1/0/8\n ipv6 traffic-filter NO_DHCP in`, correct: false, explanation: "Funktioniert, aber: pro Port pflegen, fehleranfällig, kein zentrales Konzept. DHCPv6 Guard ist die spezialisierte L2-Lösung, die genau dafür existiert und Teil der First Hop Security ist." }, { text: `ipv6 nd raguard policy SERVER_POLICY\n device-role server\n!\ninterface gi1/0/8\n ipv6 nd raguard attach-policy SERVER_POLICY`, correct: false, explanation: "Das ist RA-Guard – schützt vor Rogue-RAs, nicht vor Rogue-DHCPv6-Servern. Andere Komponente der FHS, anderer Angriff." }, { text: `interface gi1/0/8\n shutdown`, correct: false, explanation: "Abschalten ist die Holzhammer-Lösung. Funktioniert kurzfristig für DIESEN Port, aber sobald der Angreifer einen anderen Port findet, ist man wieder am Anfang." } ] }, { type: "begruendung", prompt: "Warum reicht es nicht, nur DHCPv6 Guard zu konfigurieren, wenn ihr SLAAC + RDNSS-Option im RA nutzt?", options: [ { text: "Weil RDNSS-DNS-Server nicht über DHCPv6 verteilt werden, sondern über Router Advertisements – ein Angreifer mit Rogue-RA kann also auch falsche DNS-Server unterschieben, ohne DHCPv6 zu berühren. RA-Guard ist deshalb komplementär nötig.", correct: true, explanation: "Exakt. First Hop Security ist ein Set zusammenhängender Maßnahmen: RA-Guard, DHCPv6 Guard, NDP-Inspection, IPv6 Source Guard. Wer nur eine Komponente nutzt, lässt die anderen Vektoren offen. Die Komponenten greifen jeweils unterschiedliche Spoofing-Angriffe ab." }, { text: "Weil DHCPv6 Guard nur in Cisco-Netzen funktioniert.", correct: false, explanation: "Falsch – ähnliche Mechanismen gibt es bei Juniper, HPE, etc." }, { text: "Weil DHCPv6 Guard das M-Flag nicht überprüft.", correct: false, explanation: "DHCPv6 Guard prüft DHCPv6-REPLY-Pakete, nicht das M-Flag." }, { text: "Weil RDNSS in IPv6 deaktiviert ist.", correct: false, explanation: "RDNSS ist standardisiert (RFC 8106) und in modernen Stacks aktiv." } ] } ] }, { id: 7, title: "Der NDP-Spion", topic: "Neighbor Discovery Protocol – Spoofing-Schutz", icon: Network, difficulty: "Fortgeschritten", briefing: `Im Wireshark eines Forensik-Kollegen tauchen massenhaft Neighbor Advertisements (ICMPv6 Type 136) auf. Sie behaupten, die Link-Local-Adresse fe80::1 (euer Default Gateway) gehöre zur MAC-Adresse aa:bb:cc:dd:ee:ff – aber euer echtes Gateway hat eine andere MAC. Hosts im Subnetz haben den falschen Eintrag in ihrer Neighbor Cache übernommen.`, questions: [ { type: "analyse", prompt: "Wie heißt dieser Angriff präzise und was ist sein IPv4-Pendant?", options: [ { text: "Neighbor Discovery Spoofing (auch: NDP-Spoofing oder NA-Spoofing) – das direkte Pendant zu ARP-Spoofing/ARP-Cache-Poisoning unter IPv4.", correct: true, explanation: "Korrekt. NDP ersetzt ARP unter IPv6. Der konzeptionelle Angriff ist identisch: gefälschte Adressauflösung in den Caches der Opfer. Statt 'gratuitous ARP' nutzt man 'unsolicited Neighbor Advertisements'." }, { text: "DAD-Spoofing (Duplicate Address Detection).", correct: false, explanation: "DAD-Angriffe gibt es zwar – Angreifer beanspruchen jede neue Adresse als 'belegt' und blockieren so die Autokonfiguration – aber das ist ein anderer Vektor. Hier geht es um falsche Cache-Einträge." }, { text: "Router Advertisement Flood.", correct: false, explanation: "Auch ein Angriff (RA-Flooding kann Hosts überlasten), aber Type 134 vs. 136 – nicht das, was der Mitschnitt zeigt." }, { text: "ICMPv6 Echo Spoofing.", correct: false, explanation: "Echo-Pakete sind Type 128/129 und für Angriffe dieser Art irrelevant." } ] }, { type: "config", prompt: "Welche Cisco-Konfiguration adressiert das Problem am wirkungsvollsten in einer typischen Enterprise-Umgebung?", options: [ { text: `ipv6 nd inspection policy NDPI_POLICY\n drop-unsecure\n limit address-count 10\n!\ninterface range gi1/0/1 - 23\n ipv6 nd inspection attach-policy NDPI_POLICY\n!\nipv6 source-guard policy SG_POLICY\n!\ninterface range gi1/0/1 - 23\n ipv6 source guard attach-policy SG_POLICY`, correct: true, explanation: "Kombination aus NDP-Inspection (validiert Neighbor Advertisements anhand der Binding-Tabelle) und IPv6 Source Guard (blockiert IPv6-Pakete mit unautorisierten Source-Adressen). Limit auf 10 Adressen pro Port verhindert Cache-Overflow-Angriffe." }, { text: `ipv6 neighbor 2001:db8::1 gi1/0/1 aa:bb:cc:dd:ee:ff`, correct: false, explanation: "Statische Neighbor-Einträge funktionieren technisch, sind aber pro Host und pro Switch zu pflegen – in größeren Umgebungen unwartbar. Für einzelne kritische Geräte (Router, zentrale Server) zusätzlich sinnvoll, als Hauptmaßnahme aber unpraktikabel." }, { text: `ipv6 access-list BLOCK_NA\n deny icmp any any nd-na\n permit ipv6 any any`, correct: false, explanation: "Killt komplett die Adressauflösung in IPv6 – nichts kommuniziert mehr. Neighbor Advertisements sind betriebsnotwendig, sie müssen validiert werden, nicht geblockt." }, { text: `interface gi1/0/8\n ipv6 nd ra suppress`, correct: false, explanation: "Unterdrückt eigene RAs des Routers – hat mit NA-Spoofing in beide Richtungen nichts zu tun." } ] }, { type: "begruendung", prompt: "Warum hat sich SEND (Secure Neighbor Discovery, RFC 3971) trotz vorhandener Spezifikation in der Praxis nicht durchgesetzt – obwohl es das Problem kryptografisch lösen würde?", options: [ { text: "Komplexe PKI nötig (CGAs – Cryptographically Generated Addresses), wenig OS-Support, hoher Performance-Overhead, kaum Hardware-Unterstützung in Switches – pragmatisch hat sich First Hop Security (RA-Guard, DHCPv6 Guard, NDP Inspection) als 'good enough'-Lösung durchgesetzt.", correct: true, explanation: "Genau diese Mischung. CGAs erfordern, dass die Interface-ID kryptografisch aus einem Public Key abgeleitet wird – das verändert das Adressmodell fundamental. Die Anwendungslandschaft, Treiber und Switches sind nie nachgezogen. FHS löst 80 % der Praxisprobleme mit deutlich weniger Aufwand." }, { text: "Weil SEND nur unter Linux funktioniert.", correct: false, explanation: "Es gab Implementierungen für mehrere Plattformen, aber keine ist Standard-Bestandteil moderner OS." }, { text: "Weil der RFC zurückgezogen wurde.", correct: false, explanation: "RFC 3971 ist weiterhin gültig, aber faktisch verwaist." }, { text: "Weil SEND IPv4 voraussetzt.", correct: false, explanation: "Im Gegenteil – SEND ist explizit für IPv6." } ] } ] }, { id: 8, title: "Bogons und Hijacker", topic: "Bogon-Filter & RPKI", icon: Lock, difficulty: "Fortgeschritten", briefing: `Im Internet-Edge-Router-Log fallen verdächtige Pakete auf: Quell-Adressen aus fc00::/7, ::1/128 und 2002::/16. Gleichzeitig meldet ein BGP-Monitoring-Service, dass jemand euer Präfix 2001:db8:1000::/40 angeblich aus einem fremden AS announcen soll – ein klassischer Hijacking-Versuch.`, questions: [ { type: "analyse", prompt: "Welche dieser Adressen dürfen NIEMALS am Internet-Perimeter als Quelle akzeptiert werden?", options: [ { text: "::1/128 (Loopback), fc00::/7 (ULA), fe80::/10 (Link-Local), 2001:db8::/32 (Documentation), 2002::/16 (6to4 wenn nicht aktiv genutzt) – plus eigenes Präfix von außen.", correct: true, explanation: "Komplette Bogon-Liste. RFC 6890 definiert spezielle IPv6-Adressblöcke. Loopback und Link-Local von extern sind ein klares Spoofing-Indiz. ULA hat im Internet nichts zu suchen. 2001:db8:: ist nur für Doku. Eigenes Präfix von außen = klares Spoofing." }, { text: "Nur 2001:db8::/32 muss geblockt werden.", correct: false, explanation: "Zu wenig. Die anderen Bereiche sind gleichermaßen problematisch." }, { text: "Nur ::1/128 ist kritisch.", correct: false, explanation: "Loopback ist nur einer von mehreren Bogon-Bereichen." }, { text: "Alle Adressen, die mit 2 beginnen.", correct: false, explanation: "2000::/3 ist der reguläre Global-Unicast-Bereich – das ist normaler Internet-Traffic." } ] }, { type: "config", prompt: "Welche Cisco-Konfiguration realisiert einen sinnvollen Bogon-Filter eingehend am Border-Router?", options: [ { text: `ipv6 access-list BOGON_IN\n deny ipv6 ::1/128 any\n deny ipv6 FC00::/7 any\n deny ipv6 FE80::/10 any\n deny ipv6 2001:DB8::/32 any\n deny ipv6 2002::/16 any\n deny ipv6 2001:DB8:1000::/40 any\n permit icmp any any packet-too-big\n permit icmp any any unreachable\n permit icmp any any time-exceeded\n permit ipv6 any any\n!\ninterface gi0/0\n ipv6 traffic-filter BOGON_IN in`, correct: true, explanation: "Sauber: Bogons (Loopback, ULA, Link-Local, Documentation, 6to4) und das eigene Präfix als Quelle blocken, kritische ICMPv6-Typen explizit erlauben, dann normalen Traffic durchlassen. Wichtig: 'permit ipv6 any any' am Ende – sonst sperrt man sich selbst aus." }, { text: `ipv6 access-list BOGON_IN\n deny ipv6 any any\n!\ninterface gi0/0\n ipv6 traffic-filter BOGON_IN in`, correct: false, explanation: "Komplette Sperre = kein Traffic. Selbsterklärendes Problem." }, { text: `ipv6 access-list BOGON_IN\n permit ipv6 ::1/128 any\n permit ipv6 FC00::/7 any\n permit ipv6 FE80::/10 any`, correct: false, explanation: "Logikfehler: Hier wird genau das ERLAUBT, was geblockt werden soll. Außerdem fehlt das implizite 'deny any any' am Ende, das alles andere abblockt – also wäre der reguläre Internet-Traffic auch geblockt." }, { text: `interface gi0/0\n ipv6 verify unicast source reachable-via any`,
correct: false,
explanation: “uRPF (Unicast Reverse Path Forwarding) hilft gegen Spoofing aus dem eigenen Präfix, aber nicht gegen Bogons aus reservierten Bereichen mit gültiger Routing-Tabelle. Ist eine sinnvolle Ergänzung, kein Ersatz.”
}
]
},
{
type: “begruendung”,
prompt: “Was leistet RPKI bei einem BGP-Hijack-Versuch deines Präfixes – und was leistet es NICHT?”,
options: [
{ text: “RPKI signiert kryptografisch die Bindung Präfix↔AS via ROA. Routing-Validatoren prüfen BGP-Updates und markieren ungültige Routen. Es schützt vor Origin-Hijacks, aber NICHT vor Path-Manipulation oder gefälschten AS-Pfaden im Inneren – dafür braucht es BGPsec, das praktisch nicht ausgerollt ist.”, correct: true, explanation: “Genau das ist die Stärke und Grenze. RPKI ist Origin-Validation: ‘Darf AS X überhaupt Präfix Y announcen?’. Es prüft NICHT, ob der gesamte AS-Pfad echt ist – ein Angreifer könnte einen gültigen ROA-konformen Origin behaupten und einen falschen Pfad anhängen. BGPsec wäre die kryptografische Pfad-Validierung – ist aber wegen Performance- und Roll-out-Problemen kaum verbreitet.” },
{ text: “RPKI verschlüsselt den BGP-Traffic Ende-zu-Ende.”, correct: false, explanation: “RPKI ist eine PKI-Infrastruktur für Routing-Origin-Validierung, kein Verschlüsselungsprotokoll.” },
{ text: “RPKI ersetzt vollständig BGP.”, correct: false, explanation: “Es ist eine Erweiterung/Validierungsschicht ÜBER BGP, kein Ersatz.” },
{ text: “RPKI funktioniert nur unter IPv4.”, correct: false, explanation: “RPKI funktioniert für beide Adressfamilien gleichermaßen.” }
]
}
]
}
];

// ============================================================
// HILFSFUNKTIONEN
// ============================================================
const getRank = (score, max) => {
const pct = (score / max) * 100;
if (pct >= 90) return { title: “Senior Security Architect”, desc: “Du beherrschst IPv6-Sicherheit auf Architekturebene. Beeindruckend.”, color: “text-amber-300” };
if (pct >= 75) return { title: “Senior Network Admin”, desc: “Solide Praxis. Du würdest in einem produktiven Netz Verantwortung tragen können.”, color: “text-emerald-300” };
if (pct >= 60) return { title: “Junior Admin”, desc: “Gute Grundlagen. Mit etwas mehr Tiefe wirst du sicher.”, color: “text-cyan-300” };
if (pct >= 40) return { title: “Trainee”, desc: “Kernpunkte sitzen, aber ein paar Konzepte solltest du nachschlagen.”, color: “text-yellow-300” };
return { title: “Ausbildungsbedarf”, desc: “Geh die Missionen nochmal durch – dieses Mal mit den Hinweisen.”, color: “text-rose-300” };
};

// ============================================================
// HAUPT-KOMPONENTE
// ============================================================
export default function IPv6Defender() {
const [screen, setScreen] = useState(“intro”); // intro | briefing | question | feedback | mission-complete | final
const [missionIdx, setMissionIdx] = useState(0);
const [questionIdx, setQuestionIdx] = useState(0);
const [selectedOption, setSelectedOption] = useState(null);
const [score, setScore] = useState(0);
const [missionScore, setMissionScore] = useState(0);
const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
const [hintShownThisQ, setHintShownThisQ] = useState(false);
const [completedMissions, setCompletedMissions] = useState([]);

const mission = MISSIONS[missionIdx];
const question = mission?.questions[questionIdx];
const totalQuestions = MISSIONS.reduce((s, m) => s + m.questions.length, 0);
const maxScore = totalQuestions * 10;

const startGame = () => {
setScreen(“briefing”);
setMissionIdx(0);
setQuestionIdx(0);
setSelectedOption(null);
setScore(0);
setMissionScore(0);
setHintsUsedTotal(0);
setHintShownThisQ(false);
setCompletedMissions([]);
};

const startMission = () => {
setScreen(“question”);
setQuestionIdx(0);
setMissionScore(0);
setSelectedOption(null);
setHintShownThisQ(false);
};

const submitAnswer = (optIdx) => {
setSelectedOption(optIdx);
const opt = question.options[optIdx];
if (opt.correct) {
const points = hintShownThisQ ? 5 : 10;
setScore((s) => s + points);
setMissionScore((s) => s + points);
}
setScreen(“feedback”);
};

const nextStep = () => {
setSelectedOption(null);
setHintShownThisQ(false);
if (questionIdx + 1 < mission.questions.length) {
setQuestionIdx((q) => q + 1);
setScreen(“question”);
} else {
setCompletedMissions((c) => […c, mission.id]);
setScreen(“mission-complete”);
}
};

const goToNextMissionOrFinish = () => {
if (missionIdx + 1 < MISSIONS.length) {
setMissionIdx((m) => m + 1);
setScreen(“briefing”);
} else {
setScreen(“final”);
}
};

const showHint = () => {
setHintShownThisQ(true);
setHintsUsedTotal((h) => h + 1);
};

// ============================================================
// RENDER
// ============================================================
return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-hidden">
{/* Hintergrund-Grid */}
<div className=“absolute inset-0 opacity-[0.04] pointer-events-none” style={{
backgroundImage: “linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)”,
backgroundSize: “40px 40px”
}} />
{/* Glow-Akzent */}
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

```
  <div className="relative max-w-4xl mx-auto px-6 py-8">
    {/* Header */}
    <header className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">IPv6 Defender</h1>
          <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-widest">Operations Center</p>
        </div>
      </div>
      {screen !== "intro" && screen !== "final" && (
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-[10px] uppercase text-zinc-500 tracking-widest">Score</div>
            <div className="font-mono font-bold text-emerald-400">{score} / {maxScore}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-zinc-500 tracking-widest">Mission</div>
            <div className="font-mono font-bold">{missionIdx + 1} / {MISSIONS.length}</div>
          </div>
        </div>
      )}
    </header>

    {/* INTRO-Screen */}
    {screen === "intro" && (
      <div className="space-y-8 animate-fadein">
        <div className="text-center space-y-4 py-6">
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] font-mono uppercase tracking-widest text-emerald-400">
            Schulungsszenario · Lernfeld 7/8
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-tight">
            Acht Missionen.<br />
            <span className="text-emerald-400">Ein sicheres IPv6-Netz.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Du bist Junior-Security-Admin in einem mittelständischen Unternehmen. Acht Vorfälle warten auf dich.
            Pro Mission analysierst du das Problem, wählst eine Cisco-IOS-Konfiguration und begründest deine Entscheidung.
            Hinweise sind möglich – kosten aber Punkte.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoTile icon={AlertTriangle} title="Realistische Vorfälle" text="Szenarien, wie sie im Betrieb tatsächlich vorkommen." />
          <InfoTile icon={Terminal} title="Cisco-Konfiguration" text="Echte IOS-Befehle, in Packet Tracer nachvollziehbar." />
          <InfoTile icon={Trophy} title="Begründungspflicht" text="Nicht raten – verstehen. Jede Entscheidung wird hinterfragt." />
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3 font-mono">Mission-Übersicht</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MISSIONS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-800/40 transition">
                  <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.id}. {m.title}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{m.topic}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={startGame} className="group w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20">
          MISSION 1 STARTEN
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
        </button>
      </div>
    )}

    {/* BRIEFING */}
    {screen === "briefing" && mission && (
      <div className="space-y-6 animate-fadein">
        <ProgressBar idx={missionIdx} total={MISSIONS.length} />
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <div className="flex items-center gap-3">
              <mission.icon className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-zinc-500 font-mono">Mission {mission.id} · {mission.difficulty}</div>
                <h3 className="text-lg font-bold">{mission.title}</h3>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline">{mission.topic}</span>
          </div>
          <div className="px-6 py-6">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2 font-mono">// Eingehende Meldung</div>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{mission.briefing}</p>
          </div>
        </div>
        <button onClick={startMission} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
          FALL ANNEHMEN <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )}

    {/* QUESTION */}
    {screen === "question" && question && (
      <div className="space-y-5 animate-fadein">
        <ProgressBar idx={missionIdx} total={MISSIONS.length} />
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-zinc-500">FRAGE {questionIdx + 1} / {mission.questions.length}</span>
          <span className="px-2 py-0.5 bg-zinc-800 rounded font-mono uppercase tracking-widest text-[10px] text-emerald-400">
            {question.type === "analyse" && "Analyse"}
            {question.type === "config" && "Konfiguration"}
            {question.type === "begruendung" && "Begründung"}
          </span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-5 leading-snug">{question.prompt}</h3>
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                className="w-full text-left p-4 bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-800/80 rounded-lg transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-zinc-500 group-hover:text-emerald-400 shrink-0 mt-0.5 text-sm">[{String.fromCharCode(65 + i)}]</span>
                  {question.type === "config" ? (
                    <pre className="text-xs sm:text-sm font-mono text-zinc-300 whitespace-pre-wrap break-all">{opt.text}</pre>
                  ) : (
                    <span className="text-sm text-zinc-200 leading-relaxed">{opt.text}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        {!hintShownThisQ ? (
          <button onClick={showHint} className="text-xs text-zinc-500 hover:text-amber-300 flex items-center gap-2 mx-auto transition">
            <Lightbulb className="w-3.5 h-3.5" /> Hinweis anzeigen (–5 Punkte für diese Frage)
          </button>
        ) : (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 flex gap-3">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100/90 leading-relaxed">
              {question.type === "analyse" && "Achte auf den genauen Mechanismus auf Protokollebene – nicht auf oberflächliche Symptome. Welcher RFC-Mechanismus erklärt das Verhalten?"}
              {question.type === "config" && "Cisco-IOS-Befehle sind kontextspezifisch – nur weil ein Befehl IPv6 enthält, heißt das nicht, dass er für DIESEN Angriff gedacht ist. Schau genau hin: Was wird beschützt, was geblockt, in welcher Richtung?"}
              {question.type === "begruendung" && "Strukturelle Unterschiede zwischen IPv4 und IPv6 sind hier der Schlüssel – frag dich: Warum fehlt unter IPv6 ein Schutz, der unter IPv4 selbstverständlich ist?"}
            </div>
          </div>
        )}
      </div>
    )}

    {/* FEEDBACK */}
    {screen === "feedback" && question && selectedOption !== null && (
      <div className="space-y-5 animate-fadein">
        <ProgressBar idx={missionIdx} total={MISSIONS.length} />
        <div className={`bg-zinc-900/60 border rounded-lg overflow-hidden ${question.options[selectedOption].correct ? "border-emerald-500/40" : "border-rose-500/40"}`}>
          <div className={`px-6 py-3 flex items-center gap-2 ${question.options[selectedOption].correct ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {question.options[selectedOption].correct ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-300">Korrekt · +{hintShownThisQ ? 5 : 10} Punkte</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-rose-300">Nicht ganz</span>
              </>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-mono">Deine Antwort</div>
              {question.type === "config" ? (
                <pre className="text-xs font-mono text-zinc-300 bg-zinc-950/60 p-3 rounded border border-zinc-800 whitespace-pre-wrap break-all">{question.options[selectedOption].text}</pre>
              ) : (
                <p className="text-zinc-300 text-sm">{question.options[selectedOption].text}</p>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2 font-mono">// Auflösung</div>
              <p className="text-zinc-200 leading-relaxed text-sm">{question.options[selectedOption].explanation}</p>
            </div>
            {!question.options[selectedOption].correct && (
              <div className="pt-3 border-t border-zinc-800">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-mono">Die korrekte Antwort wäre gewesen</div>
                {question.options.filter(o => o.correct).map((o, i) => (
                  <div key={i} className="space-y-2">
                    {question.type === "config" ? (
                      <pre className="text-xs font-mono text-emerald-300 bg-emerald-500/5 p-3 rounded border border-emerald-500/20 whitespace-pre-wrap break-all">{o.text}</pre>
                    ) : (
                      <p className="text-emerald-300 text-sm">{o.text}</p>
                    )}
                    <p className="text-zinc-400 text-sm leading-relaxed">{o.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={nextStep} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
          {questionIdx + 1 < mission.questions.length ? "WEITER" : "MISSION ABSCHLIESSEN"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )}

    {/* MISSION COMPLETE */}
    {screen === "mission-complete" && mission && (
      <div className="space-y-6 animate-fadein text-center py-8">
        <div className="inline-block w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Mission {mission.id} abgeschlossen</div>
          <h2 className="text-3xl font-black">{mission.title}</h2>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Erreicht</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{missionScore}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Maximal</div>
              <div className="text-2xl font-bold text-zinc-400 font-mono">{mission.questions.length * 10}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Gesamt</div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{score}</div>
            </div>
          </div>
        </div>
        <button onClick={goToNextMissionOrFinish} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-8 rounded-lg inline-flex items-center gap-2 transition">
          {missionIdx + 1 < MISSIONS.length ? "NÄCHSTE MISSION" : "ABSCHLUSS-DEBRIEFING"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )}

    {/* FINAL SCREEN */}
    {screen === "final" && (
      <div className="space-y-6 animate-fadein">
        {(() => {
          const rank = getRank(score, maxScore);
          return (
            <>
              <div className="text-center py-6 space-y-4">
                <Trophy className={`w-16 h-16 mx-auto ${rank.color}`} />
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Debriefing · Endbewertung</div>
                  <h2 className={`text-4xl font-black ${rank.color}`}>{rank.title}</h2>
                  <p className="text-zinc-400 mt-3 max-w-lg mx-auto">{rank.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Score" value={`${score} / ${maxScore}`} accent="emerald" />
                <Stat label="Quote" value={`${Math.round((score / maxScore) * 100)}%`} accent="cyan" />
                <Stat label="Missionen" value={`${MISSIONS.length}`} accent="zinc" />
                <Stat label="Hinweise genutzt" value={`${hintsUsedTotal}`} accent="amber" />
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><Cpu className="w-4 h-4 text-emerald-400" />Zentrale Erkenntnisse</h3>
                <ul className="text-sm text-zinc-300 space-y-2 leading-relaxed">
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>IPv6-Sicherheit ist kein 1:1-Übertrag von IPv4 – die Protokolle sind strukturell anders.</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>First Hop Security (RA-Guard, DHCPv6 Guard, NDP-Inspection, Source Guard) ist die pragmatische Antwort, wo SEND nicht ausgerollt werden kann.</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>NAT war nie Sicherheit – die Stateful Firewall ist der eigentliche Schutz, sowohl unter IPv4 als auch unter IPv6.</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>Ein /64 schützt nicht durch Größe, sondern nur, wenn Adressen wirklich unvorhersagbar sind und kein DNS sie verrät.</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>ICMPv6 ist kein Diagnose-Add-on, sondern Betriebsgrundlage – RFC 4890 statt Holzhammer.</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400 font-mono">›</span><span>Tunnel-Mechanismen wie Teredo öffnen Bypass-Pfade selbst durch IPv4-Firewalls hindurch.</span></li>
                </ul>
              </div>

              <button onClick={startGame} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition border border-zinc-700">
                <RotateCcw className="w-4 h-4" /> NEU STARTEN
              </button>
            </>
          );
        })()}
      </div>
    )}
  </div>

  <style>{`
    @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadein { animation: fadein 0.4s ease-out; }
  `}</style>
</div>
```

);
}

// ============================================================
// SUB-KOMPONENTEN
// ============================================================
function InfoTile({ icon: Icon, title, text }) {
return (
<div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
<Icon className="w-5 h-5 text-emerald-400 mb-2" />
<div className="font-bold text-sm mb-1">{title}</div>
<div className="text-xs text-zinc-400 leading-relaxed">{text}</div>
</div>
);
}

function ProgressBar({ idx, total }) {
const pct = ((idx) / total) * 100;
return (
<div className="space-y-1">
<div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
<span>Fortschritt</span>
<span>{idx + 1} / {total}</span>
</div>
<div className="h-1 bg-zinc-800 rounded overflow-hidden">
<div className=“h-full bg-emerald-500 transition-all duration-500” style={{ width: `${pct + (100 / total)}%` }} />
</div>
</div>
);
}

function Stat({ label, value, accent }) {
const colors = {
emerald: “text-emerald-400”,
cyan: “text-cyan-400”,
zinc: “text-zinc-300”,
amber: “text-amber-400”
};
return (
<div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 text-center">
<div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">{label}</div>
<div className={`text-xl font-black font-mono ${colors[accent]}`}>{value}</div>
</div>
);
}