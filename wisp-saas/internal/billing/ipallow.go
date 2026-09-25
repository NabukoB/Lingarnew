package billing

import "net/netip"

// ipAllowed reports whether ip is inside the allowlist. An empty list allows
// everything (development only; config.RequireFor enforces it in production).
func ipAllowed(list []netip.Prefix, ip string) bool {
	if len(list) == 0 {
		return true
	}
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return false
	}
	addr = addr.Unmap()
	for _, p := range list {
		if p.Contains(addr) {
			return true
		}
	}
	return false
}
