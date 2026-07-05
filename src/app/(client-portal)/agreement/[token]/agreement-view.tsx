"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Pen, RotateCcw, Loader2, Printer } from "lucide-react";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

interface Client {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface AgreementViewProps {
  token: string;
  agreementId: string;
  rcicName: string;
  rcicNumber: string;
  orgName: string;
  orgAddress: string;
  client: Client;
  serviceType: string;
  feeAmount: number;
  feeCurrency: string;
  alreadySigned: boolean;
  signedAt: string | null;
}

export function AgreementView({
  token, agreementId, rcicName, rcicNumber, orgName, orgAddress,
  client, serviceType, feeAmount, feeCurrency, alreadySigned, signedAt,
}: AgreementViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadySigned);
  const [error, setError] = useState<string | null>(null);

  const clientFullName = `${client.firstName} ${client.lastName}`;
  const fmtFee = new Intl.NumberFormat("en-CA", { style: "currency", currency: feeCurrency }).format(feeAmount);
  const serviceLabel = CASE_TYPE_LABELS[serviceType] ?? serviceType;
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  // ── Canvas ──────────────────────────────────────────────────────────────
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    const s = "touches" in e ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    setDrawing(true);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasSignature(true);
  }
  function endDraw() { setDrawing(false); }
  function clearCanvas() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasSignature(false);
  }

  async function submit() {
    if (!hasSignature) return;
    setSubmitting(true); setError(null);
    try {
      const signatureData = canvasRef.current!.toDataURL("image/png");
      const res = await fetch("/api/client-portal/agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, agreementId, signatureData }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Agreement Signed</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Thank you, {clientFullName}. Your retainer agreement with {orgName} has been signed
            {signedAt ? ` on ${fmtDate(signedAt)}` : ""}.
          </p>
          <p className="mt-4 text-xs text-zinc-400">Your consultant has been notified. You will receive a copy by email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 print:bg-white">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">{orgName}</p>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Retainer Agreement</h1>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0">
        {/* Agreement document */}
        <div className="rounded-xl border border-zinc-200 bg-white px-8 py-10 text-sm leading-relaxed text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 print:rounded-none print:border-none print:shadow-none">

          <h2 className="mb-1 text-center text-lg font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">Retainer Agreement</h2>
          {rcicNumber && <p className="mb-2 text-center text-xs text-zinc-500">RCIC Membership Number: {rcicNumber}</p>}

          {/* Application type — prominent */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Application Type</p>
            <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-50">{serviceLabel}</p>
          </div>

          <p className="mb-6">
            <strong>{clientFullName}</strong>{client.address ? ` of ${client.address}` : ""} (Hereinafter "Applicant") and,{" "}
            <strong>{rcicName}</strong> (Hereinafter "Consultant"), a Regulated Canadian Immigration Consultant, Member of the
            Immigration Consultants of Canada Regulatory Council (ICCRC){rcicNumber ? `, Membership No ${rcicNumber}` : ""} carrying on the
            practice of Immigration Consulting at <strong>{orgName}</strong>{orgAddress ? ` at ${orgAddress}` : ""}.
          </p>

          <Section title="A. RCIC Responsibilities & Commitment">
            <p className="mb-3">The Consultant (RCIC) agrees to act for the "Applicant" &amp; provide services as listed below to the Applicant with respect to <strong>{serviceLabel}</strong>.</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>To advise Applicant on the Canadian Immigration Act and Regulations and procedures relating to the application.</li>
              <li>To conduct an assessment on the Applicant's background and qualifications.</li>
              <li>To prepare and advise the Applicant in writing of options that offers the best chance of a successful application. The decision on how to proceed rests with the Applicant.</li>
              <li>To provide the Applicant with the check list of information and documents required in support of the application.</li>
              <li>To assist in the preparation of Applicant's application and gathering of relevant supporting documents as required.</li>
              <li>To advise and to assist the submission of applications of accompanying family members to remit processing fees as required (see Section C, part 1).</li>
              <li>To assist with the preparation, if required, for an interview with CIC or a Visa office in consideration of the application.</li>
              <li>To represent Applicant and family members in respect of the above application before the Minister, Officer, or the Immigration and Refugee Board as necessary to follow up with the processing office to minimize delays and to comply with any additional documentation requests.</li>
              <li>To keep Applicant informed by telephone, fax, email or other means of communication as agreed on the current status of the application.</li>
              <li>To act with due diligence in the above application and to act within the bounds of Canadian Immigration laws and ICCRC's Rules of Conduct to obtain the best result possible for the Applicant.</li>
              <li>This agreement is considered closed / RCIC's representation of the Applicant ceases at the time of the issuance of COPR and Immigrant Visa.</li>
            </ol>
            <p className="mt-3 italic text-zinc-500">The Applicant acknowledges that the Consultant will not provide advice regarding the tax laws of any country, employment or business opportunities.</p>
          </Section>

          <Section title="B. Professional Fees">
            <ol className="list-decimal space-y-2 pl-5">
              <li>All fees are in Canadian Currency.</li>
              <li>
                The Applicant hereby agrees to pay the Consultant a fee of{" "}
                <strong className="text-zinc-900 dark:text-zinc-50">non-refundable {fmtFee}</strong> for the application of{" "}
                <strong>{serviceLabel}</strong>.
              </li>
            </ol>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Applicant acknowledges that the above fees paid to the Consultant do not guarantee Applicant's admission to Canada under the category stated above, and that no representation has been made by consultant to the effect that success in the application is guaranteed. The professional services fee is payable in instalment. Government fees, disbursements such as courier fees, police clearance fees, IELTS, credential assessments, health insurance fees, and medical fees are to be paid by the client and subject to change upon mutual agreement of both parties.
            </p>
            <p className="mt-3 font-medium uppercase tracking-wide text-zinc-500">Apart from the above RCIC fee &amp; miscellaneous fees mentioned above, there are other payments to be borne by the Applicant:</p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400"><strong>Government Application Fee</strong> — as applicable</p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">RCIC fees to be paid at time of signing of this retainer. The above amount is to be paid by the client and is subject to change upon mutual agreement of both parties.</p>

            <h4 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">4. Withdrawal of Representation</h4>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">Should the Applicant wish to withdraw the above application, the Applicant must inform the Consultant in writing. Necessary procedures to withdraw the application will begin when the Consultant receives such notice. The Applicant acknowledges and agrees that there will be no refund of fees paid for services already rendered nor of funds dispersed, nor of processing or other fees paid to the Canadian government, other than those fees specifically acknowledged to be refundable by the Canadian government. If the applicant wishes to withdraw prior to the submission of the formal application, fees for services already rendered shall be charged at a rate of $100 per hour, plus applicable taxes, and subtracted from the initial retainer which will then be refunded to the Applicant.</p>

            <h4 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">5. Refund Policy</h4>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">The Client(s) acknowledge that the granting of a visa or status and the time required for processing this application is at the sole discretion of the government and not the RCIC. The Professional fees paid to us are non-refundable in the event of an application refusal. However, if the application is denied because of an error or omission on the part of the RCIC or professional staff, the RCIC will refund all professional fees collected. The Client(s) agree that the fees paid are for services indicated above, and any refund is strictly limited to the amount of fees paid.</p>
          </Section>

          <Section title="C. Other Fees and Disbursements">
            <p className="mb-2">The Applicant acknowledges and agrees that:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>The government of Canada (CIC) imposes non-refundable processing cost recovery fees for the application. The Applicant is responsible for paying all required processing fees e.g., Federal, Provincial, Department of Human Resources, or other government departments, incurred in order to process the application.</li>
              <li>The Applicant will be responsible for all costs related to medical examinations, police certificates, language assessments and other required expenditures.</li>
              <li>All aforementioned costs are in addition to the Consultant's fees, as stated in Section B.</li>
            </ol>
          </Section>

          <Section title="D. Applicant Responsibilities">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Applicant hereby agrees to provide genuine, complete, truthful and accurate documents and information and to provide such information as promptly as possible.</li>
              <li>Applicant also acknowledges that any inaccuracies or omissions and misrepresentation of information or documentation may seriously affect the application, and may lead to possible prosecution by Immigration Canada.</li>
              <li>The Applicant agrees to keep the Consultant informed in relation to any changes or updated information regarding residential address, contact number, employment status, and marital status.</li>
              <li>The applicant acknowledges that if the Applicant fails or neglects to contact the Consultant as requested, or ignores or fails to respond to requests for required information or documentation within 60 days, the Consultant may terminate this agreement and all fees paid will be forfeited.</li>
            </ol>
          </Section>

          <Section title="E. Interview">
            <p className="mb-2">The Applicant acknowledges and agrees that:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>An Officer may require an appearance at an interview.</li>
              <li>Any travel expenses and other costs incurred relating to the interview will be the sole responsibility of the Applicant.</li>
            </ol>
          </Section>

          <Section title="F. Termination">
            <p className="mb-2">The Applicant acknowledges and agrees that:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>This Agreement is considered terminated upon completion of tasks identified under section A (1–10) of this agreement.</li>
              <li>This Agreement is considered terminated if material changes occur to the Client(s) application or eligibility, which make it impossible to proceed with services detailed in section A (1–10) of this Agreement.</li>
              <li><strong>Obligatory Withdrawal</strong> — An Immigration Consultant shall sever the consultant-client relationship or withdraw as representative if: (a) discharged by the Client; (b) instructed by the Client to do something illegal or in contravention to any rules; (c) the Immigration Consultant's continued involvement will place the Immigration Consultant in a conflict of interest; or (d) the Immigration Consultant is not competent to handle the matter.</li>
              <li><strong>Optional Withdrawal</strong> — An Immigration Consultant may sever the consultant-client relationship if there has been a serious loss of confidence, such as where: (a) the Client has deceived the Immigration Consultant; (b) the Client has refused to give adequate instructions; or (c) the Client has refused to accept and act upon the Consultant's advice on a significant point.</li>
              <li><strong>Residual Right to Withdrawal</strong> — In situations not covered by articles F1 and F2, the Consultant may withdraw only if the withdrawal will not be unfair to the Applicant and is not done for an improper purpose.</li>
              <li><strong>Withdrawal for Non-Payment</strong> — After reasonable notice, if the Applicant fails to provide funds on account for disbursements or fees, the Consultant may withdraw unless serious prejudice to the Applicant would result.</li>
              <li>Should the Applicant wish to withdraw the application, notice must be provided to the Consultant in writing, and all fees paid to the Consultant for services already rendered will be forfeited.</li>
            </ol>
          </Section>

          <Section title="G. Confidentiality">
            <p className="mb-2">All information and documentation reviewed by the RCIC, required by CIC and all other governing bodies, and used for the preparation of the application will not be divulged to any third party, other than agents and employees, without prior consent, except as demanded by law. The RCIC and all agents and employees are also bound by the confidentiality requirements of Article 8.1 and 8.5 of the Code of Professional Ethics.</p>
            <p className="mb-2">The Client(s) agree to the use of electronic communication and storage of confidential information. The RCIC will use his/her best efforts to maintain a high degree of security for electronic communication and information storage.</p>
            <p>The Applicant acknowledges and agrees that the Consultant may consult about the Applicant's case with other Immigration consultants or persons with specific expertise in immigration law or government affairs, in order to maximise the quality of advice available to the Applicant.</p>
          </Section>

          <Section title="H. Circumstances Beyond the Control of the Consultant">
            <p>The Consultant will not be responsible for retroactive changes to any Immigration Act or Regulation, delays by authorities, closure of Visa offices / Consulates / High Commissions / Embassies, change of Federal or Provincial Immigration Regulations, Acts of God and any acts beyond the Consultant's control.</p>
          </Section>

          <Section title="I. Complaints / Disputes">
            <p className="mb-2">{rcicName} is a member in good standing of the Immigration Consultants of Canada Regulatory Council (ICCRC), and as such, is bound by its By-laws, Code of Professional Ethics, and associated Regulations.</p>
            <p className="mb-2">Any complaints the Applicant has with respect to services provided by the Consultant shall be addressed as follows:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>The Applicant shall make a complaint in writing to the Consultant.</li>
              <li>The Consultant shall respond to the substance of the complaint within 30 days.</li>
            </ol>
            <p className="mt-3 text-zinc-500">ICCRC Contact: 5500 North Service Rd., Suite 1002, Burlington, ON, L7L 6W6 · Toll free: 1-877-836-7543 · www.iccrc-crcic.ca</p>
          </Section>

          <Section title="J. Force Majeure">
            <p>The RCIC's failure to perform any term of this Retainer Agreement as a result of conditions beyond his/her control such as, but not limited to, governmental restrictions or subsequent legislation, war, strikes, or acts of God, shall not be deemed a breach of this Agreement.</p>
          </Section>

          <Section title="K. Change Policy">
            <p>The Client(s) acknowledge that if the RCIC is asked to act on the Client(s) behalf on matters other than those outlined above, or because of a material change in the Client(s) circumstances, or because of material facts not disclosed at the outset of the application, or because of a change in government legislation regarding the processing of immigration-related applications, the Agreement can be modified accordingly upon mutual agreement.</p>
          </Section>

          <Section title="L. Other">
            <ol className="list-decimal space-y-2 pl-5">
              <li>In the event Citizenship and Immigration Canada (CIC) or Human Resources Skills and Development Canada (HRSDC) or PNP should contact the Client(s) directly, the Client(s) are instructed to notify the RCIC immediately.</li>
              <li>The Client(s) are to immediately advise the RCIC of any change in the marital, family, or civil status or change of physical address or contact information for any person included in the application.</li>
              <li>The Client(s) understand that they must be accurate and honest in the information they provide and that any inaccuracies may void this Agreement, or seriously affect the outcome of the application or the retention of any status they may obtain.</li>
              <li>In the event of a joint retainer agreement, the Client(s) understand that no information received in connection with the matter from one Client can be treated as confidential so far as any of the other Clients are concerned, and that if a conflict develops that cannot be resolved, the RCIC may have to withdraw completely.</li>
            </ol>
          </Section>

          <Section title="M. Governing Law">
            <ol className="list-decimal space-y-1 pl-5">
              <li>This agreement is governed by the law of British Columbia in relation to any necessary arbitration.</li>
              <li>The interpretation of this agreement will be based on the language of English.</li>
            </ol>
          </Section>

          {/* Signature lines — print only */}
          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <p className="mb-6 font-semibold text-zinc-900 dark:text-zinc-50">This agreement is agreed and signed:</p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-medium">{rcicName} (RCIC)</p>
                <div className="mt-6 border-b border-zinc-400" />
                <p className="mt-1 text-xs text-zinc-500">Signature &amp; Date: {today}</p>
              </div>
              <div>
                <p className="font-medium">{clientFullName} (CLIENT)</p>
                <div className="mt-6 border-b border-zinc-400" />
                <p className="mt-1 text-xs text-zinc-500">Signature &amp; Date: ___________________</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature capture — hidden on print */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <Pen className="h-4 w-4" /> Sign Below
            </div>
            {hasSignature && (
              <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            By signing, I, <strong>{clientFullName}</strong>, confirm I have read and agree to all terms of this Retainer Agreement.
          </p>
          <canvas
            ref={canvasRef}
            width={680}
            height={140}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full touch-none cursor-crosshair rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
            style={{ height: 140 }}
          />
          {!hasSignature && <p className="mt-2 text-center text-xs text-zinc-400">Draw your signature above</p>}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={!hasSignature || submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Sign & Submit Retainer Agreement"}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-400">
            This is a legally binding agreement. Please read all sections carefully before signing.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {children}
    </div>
  );
}
