"use strict"
import { FrappeForm, TabVersion, VersionData } from "@anygridtech/frappe-types/client/frappe/core";

declare global {
  interface Window {
    cur_frm?: FrappeForm;
  }
  const frappe_workflow_history: {
    load_history_field: () => Promise<void>;
  };
}

frappe.provide("frappe_workflow_history.load_history_field");

function destroyHistoryContainer() {
  const old = document.getElementById("frappe-workflow-history");
  if (old && old.parentNode) {
    old.parentNode.removeChild(old);
  }
}
frappe_workflow_history.load_history_field = async () => {
  if (!window.cur_frm || !cur_frm.doc || !cur_frm.doc.name || !cur_frm.doctype) {
    destroyHistoryContainer();
    return;
  }
  // Don't show history in print mode, preview, email, customize mode, or new document.
  const frm: any = cur_frm;
  const isLocal = frm.doc.__islocal;
  const isNew = typeof frm.is_new === "function" ? frm.is_new() : false;
  const inPrint = typeof frm.in_print !== "undefined" ? frm.in_print : false;
  const inEmail = typeof frm.in_email !== "undefined" ? frm.in_email : false;
  const inPreview = typeof frm.in_preview !== "undefined" ? frm.in_preview : false;
  const inDialog = typeof frm.in_dialog !== "undefined" ? frm.in_dialog : false;
  const inCustomize = typeof frm.in_customize !== "undefined" ? frm.in_customize : false; // Check for customize mode
  if (isLocal || isNew || inPrint || inEmail || inPreview || inDialog || inCustomize) {
    destroyHistoryContainer();
    return;
  }

  // Remove old container before creating a new one
  destroyHistoryContainer();

  // Create/inject the container in the correct location
  let historyContainer = document.createElement("div");
  historyContainer.id = "frappe-workflow-history";
  historyContainer.className = "timeline-section mt-4";

  // Try to insert before comments section, 
  // if not found, try timeline section, 
  // if not found, try after form header, else append to body.
  const commentsSection = document.querySelector(".comment-box");
  const timelineSection = document.querySelector(".new-timeline");
  if (commentsSection && commentsSection.parentNode) {
    commentsSection.parentNode.insertBefore(historyContainer, commentsSection);
  } else if (timelineSection && timelineSection.parentNode) {
    timelineSection.parentNode.insertBefore(historyContainer, timelineSection);
  } else {
    const formHeader = document.querySelector(".form-dashboard-section") || document.querySelector(".page-head");
    if (formHeader && formHeader.parentNode) {
      formHeader.parentNode.insertBefore(historyContainer, formHeader.nextSibling);
    } else {
      document.body.appendChild(historyContainer);
    }
  }

  historyContainer.innerHTML = "";
  const currentDoctype = cur_frm.doctype;
  const versions = await frappe.db.get_list("Version", {
    fields: ["ref_doctype", "docname", "data", "owner", "creation"],
    filters: {
      ref_doctype: currentDoctype,
      docname: cur_frm.doc.name
    },
    order_by: "creation DESC",
  }) as TabVersion[];

  let timeline = "";
  if (versions.length > 0) {
    versions.forEach((version: TabVersion) => {
      const changes = (JSON.parse(version.data).changed || []) as VersionData["changed"];
      changes.forEach(change => {
        if (change[0] === "workflow_state") {
          const userInfo = (window as any).frappe.user_info ? (window as any).frappe.user_info(version.owner) : { fullname: version.owner, image: "/assets/frappe/images/default-avatar.png" };
          const timeAgo = frappe.datetime.comment_when(version.creation);
          const paddingStyle = "padding:8px 16px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; margin-bottom:16px;";
          timeline += `
              <div class=\"timeline-item\" style=\"${paddingStyle} display:flex; align-items:flex-start; position:relative; max-width:520px; width:100%;\">
                <div class=\"timeline-dot\" style=\"flex-shrink:0;margin-right:12px;position:relative;z-index:1;\">
                  <div class=\"avatar avatar-small\" style=\"width:32px;height:32px;border-radius:50%;overflow:hidden;background-color:var(--bg-color);border:2px solid var(--border-color);\">
                    <img src=\"${userInfo.image}\" alt=\"${userInfo.fullname}\" style=\"width:100%;height:100%;object-fit:cover;\" onerror=\"this.onerror=null;this.src='/assets/frappe/images/default-avatar.png';\">
                  </div>
                </div>
                <div class=\"timeline-content\" style=\"flex:1;min-width:0;\">
                    <!-- User and workflow state modification info -->
                    <div 
                      style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14px; color: var(--text-color); margin-bottom: 4px;"
                    >
                      <strong>
                        <a 
                          href="/app/user-profile/${version.owner}"
                          target="_blank"
                          class="text-link"
                          style="color: #212529; text-decoration: none;"
                        >
                          ${userInfo.fullname}
                        </a>
                      </strong>
                      <!-- Workflow state modification text and time -->
                      ${__("modified a workflow state")}
                      <span 
                        class="text-muted"
                        style="font-size: 13px; margin-left: 12px; margin-top: 1px;"
                      >
                        · ${timeAgo}
                      </span>
                    </div>
                    <!-- State change indicator -->
                    <div 
                      style="margin-top: 4px; color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 8px;"
                    >
                      ${change[1] && change[2]
              ? `<span class="indicator-pill indicator gray">${change[1]}</span> &rarr; <span class="indicator-pill indicator yellow">${change[2]}</span>`
              : "<span class=\"text-muted\">—</span>"}
                    </div>
                </div>
              </div>
            `;
        }
      });
    });
  } else {
    timeline = `<div class=\"timeline-item no-activity\"><div class=\"timeline-content text-center text-muted\"><p>${__("No data found.")}</p></div></div>`;
  }
  historyContainer.innerHTML = `
    <h4 style="box-sizing:border-box;display:block;flex-basis:auto;flex-grow:1;flex-shrink:1;height:21.6px;margin-bottom:12px;margin-top:0;width:auto;text-size-adjust:100%;font-family:InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;font-size:18px;font-variation-settings:'opsz' 24;font-weight:700;letter-spacing:0.28px;line-height:21.6px;text-align:left;color:rgb(23,23,23);-webkit-font-smoothing:antialiased;margin-block-end:0;margin-block-start:0;margin-inline-end:0;margin-inline-start:0;scrollbar-color:rgb(199,199,199) rgb(237,237,237);scrollbar-width:thin;unicode-bidi:isolate;-webkit-tap-highlight-color:rgba(0,0,0,0);">Workflow Activity</h4>
    <div style="height:8px;"></div>
    <div class="timeline-items">${timeline}</div>
  `;
};

// // Hook para garantir atualização/destruição ao trocar de formulário
// if (frappe?.ui?.form?.on) {
//   [
//     "Service Protocol Inverter Checklist",
//     "Service Protocol EV Charger Checklist",
//     "Service Protocol Battery Checklist",
//     "Service Protocol Datalogger Checklist",
//     "Service Protocol Smart Meter Checklist",
//     "Service Protocol Smart Energy Manager Checklist",
//     "Compliance Statement",
//     "IT Request"
//   ].forEach(dt => {
//     frappe.ui.form.on(dt, {
//       refresh: () => frappe_workflow_history.load_history_field(),
//       after_save: () => frappe_workflow_history.load_history_field(),
//       on_cancel: () => destroyHistoryContainer(),
//       before_close: () => destroyHistoryContainer(),
//     });
//   });
// }

// Hook to ensure update/destruction when switching forms
if (frappe?.ui?.form?.on) {
  const original_on = frappe.ui.form.on;
  frappe.ui.form.on = function (...args: any[]) {
    if (args.length > 1 && typeof args[1] === 'object') {
      const handlers = args[1];
      // Add history hooks
      const original_refresh = handlers.refresh;
      handlers.refresh = function (frm: any) {
        frappe_workflow_history.load_history_field();
        if (typeof original_refresh === 'function') {
          original_refresh.call(this, frm);
        }
      };
      const original_after_save = handlers.after_save;
      handlers.after_save = function (frm: any) {
        frappe_workflow_history.load_history_field();
        if (typeof original_after_save === 'function') {
          original_after_save.call(this, frm);
        }
      };
      const original_on_cancel = handlers.on_cancel;
      handlers.on_cancel = function (frm: any) {
        destroyHistoryContainer();
        if (typeof original_on_cancel === 'function') {
          original_on_cancel.call(this, frm);
        }
      };
      const original_before_close = handlers.before_close;
      handlers.before_close = function (frm: any) {
        destroyHistoryContainer();
        if (typeof original_before_close === 'function') {
          original_before_close.call(this, frm);
        }
      };
    }
    // @ts-ignore
    return original_on.apply(this, args);
  };
}