# WISP setup for {{.RouterName}} ({{.TenantName}})
# Generated {{.Generated.Format "2006-01-02 15:04 MST"}}. Single use; expires {{.Expires.Format "2006-01-02 15:04 MST"}}.
# Everything this script adds carries the comment "wisp-saas", so running it
# again replaces the earlier setup instead of duplicating it.
{
:put "WISP setup: checking router..."
:local ver [/system resource get version]
:if ([:tonum [:pick $ver 0 [:find $ver "."]]] < 7) do={
  :error ("WISP setup stopped: RouterOS " . $ver . " detected. WireGuard needs RouterOS v7.1+. Upgrade via System > Packages > Check For Updates, then run this command again.")
}
:if ([/system resource get free-hdd-space] < 1048576) do={
  :error "WISP setup stopped: less than 1 MB of free storage. Delete old files under Files, then run this command again."
}
:if ([/ping 8.8.8.8 count=4] = 0) do={
  :error "WISP setup stopped: no internet. Plug the uplink cable into the port that has internet (on Safaricom Home Fibre use LAN2, 3 or 4, not LAN1), then run this command again."
}
:do { :resolve {{q .CheckHost}} } on-error={
  :error "WISP setup stopped: the router has internet but cannot resolve names. Set a DNS server under IP > DNS (for example 8.8.8.8), then run this command again."
}
:local gw ""
:do { :set gw [/ip route get [:pick [/ip route find dst-address=0.0.0.0/0 active=yes] 0] immediate-gw] } on-error={}
:foreach p in={{list .AllPorts}} do={
  :if ([:len [/interface find name=$p]] = 0) do={
    :error ("WISP setup stopped: port " . $p . " does not exist on this router. Fix the ports in the dashboard (Routers > your router > Ports) and copy the new command.")
  }
  :if ([:len $gw] > [:len $p] && [:pick $gw ([:len $gw] - [:len $p] - 1) [:len $gw]] = ("%" . $p)) do={
    :error ("WISP setup stopped: " . $p . " is your internet uplink. Choose other ports for customers in the dashboard and copy the new command.")
  }
}
:put "WISP setup: checking router... done"

:put "WISP setup: removing earlier WISP settings..."
/ip hotspot remove [find name="wisp-hotspot"]
/ip hotspot profile remove [find name="wisp-portal"]
/ip hotspot walled-garden remove [find comment="wisp-saas"]
/ip hotspot walled-garden ip remove [find comment="wisp-saas"]
/interface pppoe-server server remove [find service-name="WISP-PPPoE"]
/ppp profile remove [find name="wisp-pppoe"]
/ip firewall filter remove [find comment~"^wisp-saas"]
/ip firewall nat remove [find comment~"^wisp-saas"]
/ip firewall address-list remove [find list="wisp-private"]
/ip dhcp-server remove [find name="wisp-hotspot-dhcp"]
/ip dhcp-server network remove [find comment="wisp-saas"]
/ip address remove [find comment="wisp-saas"]
/ip pool remove [find comment="wisp-saas"]
/radius remove [find comment="wisp-saas"]
/interface list member remove [find comment="wisp-saas"]
/interface bridge port remove [find comment="wisp-saas"]
/interface bridge remove [find name="bridge-hotspot"]
/interface bridge remove [find name="bridge-pppoe"]
/interface wireguard peers remove [find comment="wisp-saas"]
/interface wireguard remove [find name="wg-saas"]
/user remove [find name={{q .APIUser}}]
/user group remove [find name="wisp-api"]
/system identity set name={{q .RouterName}}

:put "WISP setup: tunnel..."
/interface wireguard add name=wg-saas listen-port=13231 mtu=1420 comment=wisp-saas
/interface wireguard peers add interface=wg-saas public-key={{q .ServerKey}} endpoint-address={{q .EndpointHost}} endpoint-port={{.EndpointPort}} allowed-address={{.ServerIP}}/32 persistent-keepalive=25s comment=wisp-saas
/ip address add address={{.TunnelIP}}/32 network={{.ServerIP}} interface=wg-saas comment=wisp-saas
/ip firewall filter add chain=input in-interface=wg-saas action=accept comment="wisp-saas: cloud tunnel"
:put "WISP setup: tunnel... done"

:put "WISP setup: management access..."
/user group add name=wisp-api policy=read,write,api,rest-api,test comment=wisp-saas
/user add name={{q .APIUser}} group=wisp-api password={{q .APIPassword}} address={{.ServerIP}}/32 comment=wisp-saas
:if ([:len [/certificate find name="wisp-api"]] = 0) do={
  /certificate add name=wisp-api common-name=wisp-api days-valid=3650 key-usage=digital-signature,key-encipherment,tls-server
  /certificate sign wisp-api
}
:local i 0
:while ([:len [/certificate find name="wisp-api" private-key=yes]] = 0 && $i < 60) do={ :delay 1s; :set i ($i + 1) }
/ip service set www-ssl certificate=wisp-api address={{.ServerIP}}/32 disabled=no
:put "WISP setup: management access... done"

:put "WISP setup: RADIUS..."
/radius add service=ppp,hotspot address={{.ServerIP}} secret={{q .RadiusSecret}} src-address={{.TunnelIP}} timeout=3s comment=wisp-saas
/radius incoming set accept=yes
/ppp aaa set use-radius=yes accounting=yes interim-update=5m
:put "WISP setup: RADIUS... done"

/ip firewall address-list add list=wisp-private address=10.0.0.0/8 comment=wisp-saas
/ip firewall address-list add list=wisp-private address=172.16.0.0/12 comment=wisp-saas
/ip firewall address-list add list=wisp-private address=192.168.0.0/16 comment=wisp-saas
{{- if .PPPoEPorts}}

:put "WISP setup: PPPoE server..."
/interface bridge add name=bridge-pppoe comment=wisp-saas
:foreach p in={{list .PPPoEPorts}} do={
  /interface bridge port remove [find interface=$p]
  /interface bridge port add bridge=bridge-pppoe interface=$p comment=wisp-saas
}
/ip pool add name=wisp-pppoe-pool ranges=172.21.0.10-172.21.255.254 comment=wisp-saas
/ppp profile add name=wisp-pppoe local-address=172.21.0.1 remote-address=wisp-pppoe-pool dns-server=8.8.8.8,1.1.1.1 only-one=yes
/interface pppoe-server server add service-name=WISP-PPPoE interface=bridge-pppoe authentication=pap,chap,mschap2 default-profile=wisp-pppoe one-session-per-host=yes max-mtu=1480 max-mru=1480 disabled=no
/ip firewall nat add chain=srcnat src-address=172.21.0.0/16 dst-address-list=!wisp-private action=masquerade comment="wisp-saas: PPPoE to internet"
/ip firewall filter add chain=forward in-interface=bridge-pppoe action=drop comment="wisp-saas: PPPoE ports carry PPPoE only"
:put "WISP setup: PPPoE server... done"
{{- end}}
{{- if .HotspotPorts}}

:put "WISP setup: Hotspot + portal..."
/interface bridge add name=bridge-hotspot comment=wisp-saas
:foreach p in={{list .HotspotPorts}} do={
  /interface bridge port remove [find interface=$p]
  /interface bridge port add bridge=bridge-hotspot interface=$p comment=wisp-saas
}
/ip address add address=172.20.0.1/22 interface=bridge-hotspot comment=wisp-saas
/ip pool add name=wisp-hotspot-pool ranges=172.20.0.10-172.20.3.254 comment=wisp-saas
/ip dhcp-server add name=wisp-hotspot-dhcp interface=bridge-hotspot address-pool=wisp-hotspot-pool lease-time=1h disabled=no
/ip dhcp-server network add address=172.20.0.0/22 gateway=172.20.0.1 dns-server=172.20.0.1 comment=wisp-saas
/ip dns set allow-remote-requests=yes
:local dir "wisp-hotspot"
:if ([:len [/file find name="flash"]] > 0) do={ :set dir "flash/wisp-hotspot" }
:foreach f in={{list .HotspotFileNames}} do={
  :do { /tool fetch url=({{q .FilesURL}} . "/" . $f) dst-path=($dir . "/" . $f) output=file } on-error={
    :error "WISP setup stopped: could not download the portal pages. Check the internet connection and run the command again."
  }
}
/ip hotspot profile add name=wisp-portal hotspot-address=172.20.0.1 html-directory=$dir login-by=mac,http-pap mac-auth-mode=mac-as-username-and-password use-radius=yes radius-accounting=yes radius-interim-update=5m dns-name=""
/ip hotspot add name=wisp-hotspot interface=bridge-hotspot address-pool=none profile=wisp-portal disabled=no
{{- range .WalledGarden}}
/ip hotspot walled-garden add dst-host={{q .}} action=allow comment=wisp-saas
/ip hotspot walled-garden ip add dst-host={{q .}} action=accept comment=wisp-saas
{{- end}}
/ip firewall nat add chain=srcnat src-address=172.20.0.0/22 dst-address-list=!wisp-private action=masquerade comment="wisp-saas: Hotspot to internet"
/ip firewall nat add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect to-ports=53 comment="wisp-saas: force DNS to router"
/ip firewall nat add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect to-ports=53 comment="wisp-saas: force DNS to router"
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=udp dst-port=53,67 action=accept comment="wisp-saas: hotspot DNS + DHCP"
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=tcp dst-port=53,80,64872-64875 action=accept comment="wisp-saas: hotspot login"
/ip firewall filter add chain=input in-interface=bridge-hotspot action=drop comment="wisp-saas: hotspot users cannot manage the router"
/ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=reject comment="wisp-saas: block DNS-over-TLS bypass"
/ip firewall filter add chain=forward in-interface=bridge-hotspot dst-address-list=wisp-private action=drop comment="wisp-saas: hotspot users cannot reach private networks"
:put "WISP setup: Hotspot + portal... done"
{{- end}}

:put "WISP setup: firewall..."
:if ([:len [/ip firewall filter find where !dynamic and !(comment~"^wisp-saas")]] > 0) do={
  /ip firewall filter move [find where comment~"^wisp-saas"] destination=[:pick [/ip firewall filter find where !dynamic and !(comment~"^wisp-saas")] 0]
}
:put "WISP setup: firewall... done"

:put "WISP setup: dialing home..."
:local pub [/interface wireguard get [find name="wg-saas"] public-key]
:local serial ""
:do { :set serial [/system routerboard get serial-number] } on-error={}
:do {
  /tool fetch url={{q .CallbackURL}} http-method=post http-header-field="Content-Type: application/json" http-data=("{\"public_key\":\"" . $pub . "\",\"serial\":\"" . $serial . "\",\"version\":\"" . $ver . "\"}") output=none
} on-error={
  :error "WISP setup stopped: could not reach the cloud to finish. Check the internet connection and run the command again (copy a new command if this one expired)."
}
/file remove [find name="wisp-setup.rsc"]
:put "Setup complete. Router will dial home in ~10 seconds."
}
