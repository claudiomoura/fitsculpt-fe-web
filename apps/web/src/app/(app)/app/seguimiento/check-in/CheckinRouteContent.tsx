"use client";

import TrackingClient from "../TrackingClient";
import styles from "./CheckinRouteContent.module.css";

export default function CheckinRouteContent() {
  return (
    <div className={styles.checkinOnly}>
      <TrackingClient view="checkin" />
    </div>
  );
}
