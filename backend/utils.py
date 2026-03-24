def consolidate_results(ai_responses: list, total_files: int) -> dict:
    """
    Consolida las respuestas del análisis en un reporte maestro.
    """
    master_report = {
        "total_score": 100,
        "files_analyzed": total_files,
        "critical_issues": 0,
        "warnings": 0,
        "info_suggestions": 0,
        "findings": []
    }

    total_penalty = 0

    for response in ai_responses:
        findings = response.get("findings", [])
        for finding in findings:
            master_report["findings"].append(finding)

            severity = finding.get("severity")

            if severity == "critical":
                master_report["critical_issues"] += 1
                total_penalty += 20
            elif severity == "warning":
                master_report["warnings"] += 1
                total_penalty += 5
            elif severity == "info":
                master_report["info_suggestions"] += 1
                total_penalty += 1

    master_report["total_score"] = max(0, 100 - total_penalty)

    return master_report
