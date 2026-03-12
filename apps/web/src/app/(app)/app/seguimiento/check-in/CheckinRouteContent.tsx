"use client";

import TrackingClient from "../TrackingClient";

export default function CheckinRouteContent() {
  return (
    <div className="tracking-checkin-only">
      <TrackingClient view="checkin" />
    </div>
  );
}
