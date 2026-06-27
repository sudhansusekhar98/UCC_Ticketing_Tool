import { CheckCircle2, AlertTriangle, XCircle, Target } from 'lucide-react';
import CircularProgress from '../widgets/CircularProgress';

const TARGET = 95;

export default function SLAOverview({ stats }) {
    const compliance = Math.round(stats?.slaCompliancePercent ?? 0);
    const atRisk = stats?.slaAtRisk ?? 0;
    const breached = stats?.slaBreached ?? 0;
    const onTarget = compliance >= TARGET;
    const ringColor = onTarget ? '#10B981' : compliance >= 80 ? '#F59E0B' : '#F43F5E';
    const ringTo = onTarget ? '#34D399' : compliance >= 80 ? '#FBBF24' : '#FB7185';

    return (
        <div className="vd-sla">
            <div className="vd-sla-ring">
                <CircularProgress value={compliance} color={ringColor} gradientTo={ringTo} size={140} stroke={13}>
                    <span className="vd-sla-ring-val">{compliance}%</span>
                    <span className="vd-sla-ring-lbl">Compliant</span>
                </CircularProgress>
                <div className={`vd-sla-target ${onTarget ? 'is-good' : 'is-bad'}`}>
                    <Target size={12} />
                    {onTarget ? `Above ${TARGET}% target` : `${TARGET - compliance}% below target`}
                </div>
            </div>

            <div className="vd-sla-stats">
                <div className="vd-sla-stat">
                    <span className="vd-sla-ic" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)' }}>
                        <CheckCircle2 size={15} />
                    </span>
                    <div className="vd-sla-stat-body">
                        <span className="vd-sla-stat-val">{compliance}%</span>
                        <span className="vd-sla-stat-lbl">Within SLA</span>
                    </div>
                </div>
                <div className="vd-sla-stat">
                    <span className="vd-sla-ic" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)' }}>
                        <AlertTriangle size={15} />
                    </span>
                    <div className="vd-sla-stat-body">
                        <span className="vd-sla-stat-val">{atRisk}</span>
                        <span className="vd-sla-stat-lbl">At risk</span>
                    </div>
                </div>
                <div className="vd-sla-stat">
                    <span className="vd-sla-ic" style={{ color: '#F43F5E', background: 'rgba(244,63,94,0.1)' }}>
                        <XCircle size={15} />
                    </span>
                    <div className="vd-sla-stat-body">
                        <span className="vd-sla-stat-val">{breached}</span>
                        <span className="vd-sla-stat-lbl">Breached</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
