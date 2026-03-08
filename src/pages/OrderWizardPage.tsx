import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const steps = [
  { num: 1, title: 'Order Setup', desc: 'Customer & route' },
  { num: 2, title: 'Shipment Details', desc: 'Cargo info' },
  { num: 3, title: 'Cost Sheet', desc: 'Vendor costs' },
  { num: 4, title: 'Quotation', desc: 'Pricing' },
  { num: 5, title: 'Approval', desc: 'Customer sign-off' },
  { num: 6, title: 'Execution', desc: 'Carrier & tracking' },
  { num: 7, title: 'Invoice & Bills', desc: 'Documents' },
  { num: 8, title: 'Payments', desc: 'AR & AP' },
  { num: 9, title: 'Closure', desc: 'Final P&L' },
];

export default function OrderWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="erp-page-title">{isNew ? 'New Order' : `Order #ORD-2024-${id?.padStart(4, '0')}`}</h1>
            <p className="erp-page-subtitle">9-Step Workflow</p>
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="erp-metric-card">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => setCurrentStep(s.num)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-w-fit',
                  s.num === currentStep && 'bg-primary/10',
                  s.num < currentStep && 'opacity-70',
                )}
              >
                <div className={cn(
                  'step-indicator',
                  s.num < currentStep && 'step-complete',
                  s.num === currentStep && 'step-current',
                  s.num > currentStep && 'step-pending',
                )}>
                  {s.num < currentStep ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="erp-metric-card min-h-[400px]">
        {currentStep === 1 && <Step1OrderSetup />}
        {currentStep === 2 && <Step2ShipmentDetails />}
        {currentStep === 3 && <Step3CostSheet />}
        {currentStep === 4 && <Step4Quotation />}
        {currentStep === 5 && <Step5Approval />}
        {currentStep === 6 && <Step6Execution />}
        {currentStep === 7 && <Step7InvoiceBills />}
        {currentStep === 8 && <Step8Payments />}
        {currentStep === 9 && <Step9Closure />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" disabled={currentStep === 1} onClick={() => setCurrentStep(s => s - 1)}>
          Previous Step
        </Button>
        <Button disabled={currentStep === 9} onClick={() => setCurrentStep(s => s + 1)}>
          Next Step <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Step1OrderSetup() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 1 — Order Setup</h3>
      <p className="text-sm text-muted-foreground">Define the customer, transport mode, and routing.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Customer *</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Al-Rasheed Trading Co.</SelectItem>
              <SelectItem value="2">Kurdistan Import/Export</SelectItem>
              <SelectItem value="3">Basra Logistics LLC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Transport Mode *</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sea">Sea</SelectItem>
              <SelectItem value="air">Air</SelectItem>
              <SelectItem value="road">Road</SelectItem>
              <SelectItem value="rail">Rail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Direction *</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="export">Export</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsible Employee *</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hassan Al-Bayati</SelectItem>
              <SelectItem value="2">Noor Al-Saadi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Origin Country *</Label>
          <Input placeholder="e.g. China" />
        </div>
        <div>
          <Label>Origin City *</Label>
          <Input placeholder="e.g. Shanghai" />
        </div>
        <div>
          <Label>Destination Country *</Label>
          <Input placeholder="e.g. Iraq" />
        </div>
        <div>
          <Label>Destination City *</Label>
          <Input placeholder="e.g. Basra" />
        </div>
      </div>
    </div>
  );
}

function Step2ShipmentDetails() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 2 — Shipment Details</h3>
      <p className="text-sm text-muted-foreground">Specify cargo and timeline information.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Cargo Description *</Label>
          <Input placeholder="e.g. Industrial machinery parts" />
        </div>
        <div><Label>Weight (kg) *</Label><Input type="number" placeholder="0" /></div>
        <div><Label>Volume (CBM)</Label><Input type="number" placeholder="0" /></div>
        <div><Label>Packages</Label><Input type="number" placeholder="0" /></div>
        <div>
          <Label>Container Type</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20ft">20' Standard</SelectItem>
              <SelectItem value="40ft">40' Standard</SelectItem>
              <SelectItem value="40hc">40' High Cube</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>ETD *</Label><Input type="date" /></div>
        <div><Label>ETA *</Label><Input type="date" /></div>
        <div>
          <Label>Incoterm</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FOB">FOB</SelectItem>
              <SelectItem value="CIF">CIF</SelectItem>
              <SelectItem value="EXW">EXW</SelectItem>
              <SelectItem value="DDP">DDP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Step3CostSheet() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 3 — Cost Sheet</h3>
      <p className="text-sm text-muted-foreground">Add vendor cost line items. FX rates will be locked on save.</p>
      <div className="erp-table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Vendor</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount USD</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount IQD</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">FX</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-muted-foreground text-center" colSpan={6}>
                No cost items added yet. Click "Add Cost" to begin.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Button variant="outline"><Lock className="w-4 h-4 mr-2" />Add Cost Line</Button>
    </div>
  );
}

function Step4Quotation() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 4 — Quotation Generation</h3>
      <p className="text-sm text-muted-foreground">Set margin and generate quotation with dual currency pricing.</p>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Margin %</Label><Input type="number" placeholder="25" /></div>
        <div><Label>Validity (days)</Label><Input type="number" placeholder="30" /></div>
      </div>
      <div className="p-4 bg-accent rounded-lg text-sm">
        <p className="font-medium text-accent-foreground">Quotation PDF must be generated before proceeding to Step 5.</p>
      </div>
      <Button>Generate Quotation PDF</Button>
    </div>
  );
}

function Step5Approval() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 5 — Quotation Approval</h3>
      <p className="text-sm text-muted-foreground">Upload the signed quotation from the customer.</p>
      <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Drag & drop signed quotation PDF here, or click to browse</p>
        <Button variant="outline" className="mt-4">Upload Signed PDF</Button>
      </div>
    </div>
  );
}

function Step6Execution() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 6 — Shipment Execution</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Carrier Type</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sea">Sea Carrier</SelectItem>
              <SelectItem value="air">Air Carrier</SelectItem>
              <SelectItem value="road">Road Carrier</SelectItem>
              <SelectItem value="rail">Rail Carrier</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Carrier Name</Label><Input placeholder="e.g. Maersk Line" /></div>
        <div><Label>Container Number</Label><Input placeholder="e.g. MSKU1234567" /></div>
        <div><Label>Seal Number</Label><Input placeholder="e.g. SL123456" /></div>
        <div><Label>Actual Departure</Label><Input type="date" /></div>
        <div><Label>Actual Arrival</Label><Input type="date" /></div>
      </div>
    </div>
  );
}

function Step7InvoiceBills() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 7 — Invoice & Vendor Bills</h3>
      <p className="text-sm text-muted-foreground">Auto-generate documents from approved quotation and cost sheet.</p>
      <div className="grid grid-cols-2 gap-4">
        <Button>Generate Customer Invoice</Button>
        <Button variant="outline">Generate Vendor Bills</Button>
      </div>
    </div>
  );
}

function Step8Payments() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 8 — Payment Processing</h3>
      <p className="text-sm text-muted-foreground">Record AR/AP payments with FX gain/loss tracking.</p>
      <div className="grid grid-cols-2 gap-4">
        <Button>Record AR Payment</Button>
        <Button variant="outline">Record AP Payment</Button>
      </div>
    </div>
  );
}

function Step9Closure() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 9 — Order Closure</h3>
      <p className="text-sm text-muted-foreground">Review final profitability and close the order.</p>
      <div className="erp-metric-card bg-accent">
        <p className="text-sm font-medium text-accent-foreground">
          Final Profit = Revenue − Costs − Expenses − Commissions + FX Gain/Loss
        </p>
      </div>
      <Button variant="destructive">Close Order & Lock</Button>
    </div>
  );
}
