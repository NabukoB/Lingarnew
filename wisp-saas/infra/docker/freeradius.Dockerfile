# FreeRADIUS 3.2 as a dumb proxy to cmd/radius via rlm_rest.
FROM freeradius/freeradius-server:3.2.10
ENV RADDB=/etc/freeradius
COPY infra/freeradius/mods-available/wisp_rest $RADDB/mods-available/wisp_rest
COPY infra/freeradius/sites-available/wisp $RADDB/sites-available/wisp
COPY infra/freeradius/sites-available/wisp_dynamic_clients $RADDB/sites-available/wisp_dynamic_clients
COPY infra/freeradius/clients.conf $RADDB/clients.conf
RUN cd $RADDB \
 && rm -f sites-enabled/* \
 && ln -s ../sites-available/wisp sites-enabled/wisp \
 && ln -s ../sites-available/wisp_dynamic_clients sites-enabled/wisp_dynamic_clients \
 && ln -s ../mods-available/wisp_rest mods-enabled/wisp_rest \
 && rm -f mods-enabled/eap mods-enabled/ntlm_auth \
 && sed -i 's/^\(\s*\)auth = no/\1auth = yes/' radiusd.conf
ENV RADIUS_BACKEND_URL=http://127.0.0.1:8081 \
    WG_TUNNEL_CIDR=10.200.0.0/16 \
    RADIUS_LOCAL_SECRET=testing123
EXPOSE 1812/udp 1813/udp
CMD ["-l", "stdout"]
